document.addEventListener('DOMContentLoaded', () => {
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    const authMessage = document.getElementById('authMessage');
    const authTabs = document.querySelectorAll('.auth-tab');
    const regButton = document.querySelector('.regIn');
    const loginButton = document.querySelector('.logIn');
    const logoutButton = document.querySelector('.logoutBtn');
    const headerButtons = document.querySelector('.header_buttons');
    const headerUser = document.querySelector('.header_user');
    const userName = document.querySelector('.user-name');
    const userAvatar = document.querySelector('.user-avatar');
    const commentForm = document.getElementById('commentForm');
    const commentHint = document.getElementById('commentHint');
    const commentsList = document.getElementById('commentsList');
    const commentRating = document.getElementById('commentRating');
    const commentText = document.getElementById('commentText');
    const commentMessage = document.getElementById('commentMessage');
    let authMode = 'login';

    function openAuthModal(mode) {
        authMode = mode;
        authModal.classList.remove('hidden');
        authMessage.textContent = '';
        authForm.reset();
        authTabs.forEach(tab => {
            tab.classList.toggle('auth-tab--active', tab.dataset.mode === mode);
        });
        authForm.querySelector('.auth-form__submit').textContent = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
    }

    function closeAuthModal() {
        authModal.classList.add('hidden');
    }

    function updateCommentUI(username) {
        if (!commentForm || !commentHint) return;
        if (username) {
            const existing = commentsList ? commentsList.querySelector(`.comment-card[data-username="${username}"]`) : null;
            if (existing) {
                commentForm.classList.add('hidden');
                commentHint.textContent = 'Вы уже оставили отзыв.';
                commentHint.classList.add('comment-hint--error');
            } else {
                commentForm.classList.remove('hidden');
                commentHint.textContent = 'Оставьте оценку и отзыв к этому фильму.';
                commentHint.classList.remove('comment-hint--error');
                if (commentText) {
                    commentText.placeholder = 'Напишите отзыв до 100 слов';
                    commentText.disabled = false;
                }
                if (commentRating) commentRating.disabled = false;
                const submitButton = commentForm.querySelector('.comment-submit');
                if (submitButton) submitButton.disabled = false;
                prefillComment(username);
            }
        } else {
            commentForm.classList.add('hidden');
            commentHint.textContent = 'Войдите, чтобы оставить отзыв.';
            if (commentText) commentText.placeholder = 'Только для авторизованных пользователей';
        }
    }

    function setUser(username) {
        if (username) {
            if (headerButtons) headerButtons.classList.add('hidden');
            if (headerUser) headerUser.classList.remove('hidden');
            if (userName) userName.textContent = username;
            if (userAvatar) userAvatar.textContent = username.charAt(0).toUpperCase();
        } else {
            if (headerButtons) headerButtons.classList.remove('hidden');
            if (headerUser) headerUser.classList.add('hidden');
            if (userName) userName.textContent = '';
            if (userAvatar) userAvatar.textContent = '';
        }
        updateCommentUI(username);
    }

    function prefillComment(username) {
        if (!commentsList || !commentForm) return;
        const existingCard = commentsList.querySelector(`.comment-card[data-username="${username}"]`);
        if (!existingCard) {
            commentForm.querySelector('.comment-submit').textContent = 'Отправить отзыв';
            commentText.value = '';
            commentRating.value = '10';
            return;
        }
        const ratingValue = existingCard.dataset.rating || '10';
        const reviewText = existingCard.querySelector('.comment-text')?.textContent || '';
        commentRating.value = ratingValue;
        commentText.value = reviewText;
        commentForm.querySelector('.comment-submit').textContent = 'Обновить отзыв';
    }

    function getToken() {
        return localStorage.getItem('authToken');
    }

    function saveToken(token) {
        if (token) localStorage.setItem('authToken', token);
    }

    function clearAuth() {
        localStorage.removeItem('authToken');
        setUser(null);
    }

    function setMessage(text, type = 'error') {
        authMessage.textContent = text;
        authMessage.className = 'auth-form__message auth-form__message--' + type;
    }

    async function getMe() {
        const token = getToken();
        if (!token) {
            setUser(null);
            return;
        }

        const res = await fetch('/api/me', {
            headers: { Authorization: token }
        });

        if (!res.ok) {
            clearAuth();
            return;
        }

        const data = await res.json();
        setUser(data.username);
    }

    async function loginUser(username, password) {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return res.json();
    }

    async function registerUser(username, password) {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return res.json();
    }

    function createCommentCard(comment) {
        const article = document.createElement('article');
        article.className = 'comment-card';
        article.dataset.username = comment.username;
        article.dataset.rating = comment.rating;

        const header = document.createElement('div');
        header.className = 'comment-card__header';
        const userSpan = document.createElement('span');
        userSpan.className = 'comment-user';
        userSpan.textContent = comment.username;
        const ratingSpan = document.createElement('span');
        ratingSpan.className = 'comment-rating';
        ratingSpan.textContent = `${comment.rating}/10`;
        header.appendChild(userSpan);
        header.appendChild(ratingSpan);

        const textP = document.createElement('p');
        textP.className = 'comment-text';
        textP.textContent = comment.text;

        const dateP = document.createElement('p');
        dateP.className = 'comment-date';
        dateP.textContent = comment.updatedAt || comment.createdAt;

        article.appendChild(header);
        article.appendChild(textP);
        article.appendChild(dateP);
        return article;
    }

    function renderComment(comment) {
        if (!commentsList) return;
        const existingCard = commentsList.querySelector(`.comment-card[data-username="${comment.username}"]`);
        const newCard = createCommentCard(comment);
        if (existingCard) {
            commentsList.replaceChild(newCard, existingCard);
            return;
        }
        const emptyText = commentsList.querySelector('.comments__empty');
        if (emptyText) emptyText.remove();
        commentsList.prepend(newCard);
    }

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => openAuthModal(tab.dataset.mode));
    });

    document.querySelectorAll('[data-action="close"]').forEach(el => {
        el.addEventListener('click', closeAuthModal);
    });

    if (regButton) regButton.addEventListener('click', () => openAuthModal('register'));
    if (loginButton) loginButton.addEventListener('click', () => openAuthModal('login'));
    if (logoutButton) logoutButton.addEventListener('click', async () => {
        const token = getToken();
        if (token) {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { Authorization: token }
            });
        }
        clearAuth();
    });

    authForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(authForm);
        const username = formData.get('username');
        const password = formData.get('password');
        let result;
        try {
            if (authMode === 'login') {
                result = await loginUser(username, password);
            } else {
                result = await registerUser(username, password);
            }
            if (result.error) {
                setMessage(result.error);
            } else {
                saveToken(result.token);
                setUser(result.username);
                closeAuthModal();
            }
        } catch (error) {
            setMessage('Ошибка сети. Попробуйте позже.');
        }
    });

    if (commentForm) {
        commentForm.addEventListener('submit', async event => {
            event.preventDefault();
            console.log('Comment form submitted');
            const username = userName?.textContent || '';
            const token = getToken();
            if (!token || !username) {
                if (commentMessage) {
                    commentMessage.textContent = 'Сначала войдите.';
                    commentMessage.className = 'comment-message comment-message--error';
                }
                return;
            }

            const itemType = commentForm.itemType.value;
            const itemId = commentForm.itemId.value;
            const rating = parseInt(commentRating.value, 10);
            const text = commentText.value.trim();
            const words = text.split(/\s+/).filter(Boolean);

            console.log('Submitting comment:', { itemType, itemId, rating, text });

            if (words.length === 0) {
                if (commentMessage) {
                    commentMessage.textContent = 'Введите текст отзыва.';
                    commentMessage.className = 'comment-message comment-message--error';
                }
                return;
            }
            if (words.length > 100) {
                if (commentMessage) {
                    commentMessage.textContent = 'Отзыв не должен превышать 100 слов.';
                    commentMessage.className = 'comment-message comment-message--error';
                }
                return;
            }
            if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
                if (commentMessage) {
                    commentMessage.textContent = 'Оценка должна быть от 1 до 10.';
                    commentMessage.className = 'comment-message comment-message--error';
                }
                return;
            }

            try {
                const response = await fetch('/api/comments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: token
                    },
                    body: JSON.stringify({ itemType, itemId, rating, text })
                });
                const result = await response.json();
                console.log('Response:', result);
                if (result.error) {
                    if (commentMessage) {
                        commentMessage.textContent = result.error;
                        commentMessage.className = 'comment-message comment-message--error';
                    }
                    return;
                }

                if (commentMessage) {
                    commentMessage.textContent = 'Комментарий сохранён.';
                    commentMessage.className = 'comment-message comment-message--success';
                }
                renderComment(result);
                commentForm.classList.add('hidden');
            } catch (error) {
                console.error('Error submitting comment:', error);
                if (commentMessage) {
                    commentMessage.textContent = 'Ошибка сети. Попробуйте позже.';
                    commentMessage.className = 'comment-message comment-message--error';
                }
            }
        });
    }

    getMe();
});