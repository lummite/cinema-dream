document.addEventListener('DOMContentLoaded', () => {
    const contentContainer = document.getElementById('content-container');

    // popup элементы
    const popups = {
        sort: document.getElementById('sort-popup'),
        year: document.getElementById('year-popup'),
        genre: document.getElementById('genre-popup'),
        rating: document.getElementById('rating-popup')
    };

    // все фильтры и способ сортировки зануляем
    let currentFilters = { year: null, genres: [], rating: null };
    let currentSort = null;
    let currentCategory = contentContainer.dataset.category; // movie/series/anime

    // всплывающий popup
    function showPopup(popup, button) {
        Object.values(popups).forEach(p => p.style.display = 'none');
        popup.style.display = 'flex';
        const rect = button.getBoundingClientRect();
        const parentRect = button.closest('.media_type').getBoundingClientRect();
        popup.style.top = (rect.bottom - parentRect.top + 5) + 'px';
        popup.style.left = (rect.left - parentRect.left) + 'px';
    }

    // скрыть popup при нажатии в другое место
    document.addEventListener('click', e => {
        const isButton = [...document.querySelectorAll('.filter-sort-bar button')].some(b => b.contains(e.target));
        const isPopup = [...document.querySelectorAll('.popup')].some(p => p.contains(e.target));
        if (!isButton && !isPopup) {
            Object.values(popups).forEach(p => p.style.display = 'none');
        }
    });

    // кнопки для popup
    document.getElementById('sort-btn').addEventListener('click', e => showPopup(popups.sort, e.target));
    document.getElementById('year-filter-btn').addEventListener('click', e => showPopup(popups.year, e.target));
    document.getElementById('genre-filter-btn').addEventListener('click', e => showPopup(popups.genre, e.target));
    document.getElementById('rating-filter-btn').addEventListener('click', e => showPopup(popups.rating, e.target));

    // функция сортировки
    document.querySelectorAll('#sort-popup .popup-option').forEach(opt => {
        opt.addEventListener('click', () => {
            currentSort = opt.dataset.sort;
            fetchFilteredContent();
            popups.sort.style.display = 'none';
        });
    });

    // ФИЛЬТРЫ
    // по году (точный год)
    document.getElementById('year-apply').addEventListener('click', () => {
        const val = parseInt(document.getElementById('year-input').value);
        currentFilters.year = isNaN(val) ? null : val;
        fetchFilteredContent();
        popups.year.style.display = 'none';
    });

    // по оценке (от ...)
    document.getElementById('rating-apply').addEventListener('click', () => {
        const val = parseFloat(document.getElementById('rating-input').value);
        currentFilters.rating = isNaN(val) ? null : val;
        fetchFilteredContent();
        popups.rating.style.display = 'none';
    });

    // подгрузка жанров
    function loadGenres() {
        fetch(`/api/genres?category=${currentCategory}`)
            .then(res => res.json())
            .then(genres => {
                const container = document.getElementById('genre-options');
                container.innerHTML = '';
                genres.forEach(g => {
                    const label = document.createElement('label');
                    label.className = 'genre-label';
                    label.innerHTML = `
                        <input type="checkbox" value="${g}"> ${g}
                    `;
                    container.appendChild(label);
                });
            });
    }

    // фильтр жанров (ищет те, где есть хоть 1 выбранный жанр)
    document.getElementById('genre-apply').addEventListener('click', () => {
        const checked = [...document.querySelectorAll('#genre-options input:checked')].map(i => i.value);
        currentFilters.genres = checked;
        fetchFilteredContent();
        popups.genre.style.display = 'none';
    });

    // запрос на сервер и обновление контента
    function fetchFilteredContent() {
        const params = new URLSearchParams();
        params.append('category', currentCategory);
        if (currentFilters.year) params.append('year', currentFilters.year);
        if (currentFilters.rating) params.append('rating', currentFilters.rating);
        if (currentSort) params.append('sort', currentSort);
        currentFilters.genres.forEach(g => params.append('genres[]', g));

        fetch(`/api/filter?${params.toString()}`)
            .then(res => res.json())
            .then(items => {
                contentContainer.innerHTML = '';
                if(items.length === 0) {
                    contentContainer.innerHTML = '<p class="no-results">Ничего не найдено</p>';
                    return;
                }
                items.forEach(item => {
                    const block = document.createElement('a');
                    block.className = 'content__block';
                    block.href = `/player/${currentCategory}/${item.id}`;
                    block.innerHTML = `
                        <img class="content__img" src="/covers/${item.cover_image}" alt="${item.title}">
                        <p class="content__name">${item.title}</p>
                    `;
                    contentContainer.appendChild(block);
                });
            })
            .catch(err => console.error(err));
    }

    // подгрузка жанров при старте
    loadGenres();
});
