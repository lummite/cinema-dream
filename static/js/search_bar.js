const input = document.getElementById("search_input");
const resultsList = document.getElementById("search_results");

let timeout = null;

// принимаем текст
input.addEventListener("input", () => {
    const query = input.value.trim();

    clearTimeout(timeout);

    if (query.length < 2) {
        resultsList.innerHTML = "";
        resultsList.classList.remove("active");
        return;
    }

    timeout = setTimeout(() => {
        searchMovies(query);
    }, 300);
});

// поиск контента по названию
async function searchMovies(query) {
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        showResults(data);
    } catch (error) {
        console.error("Ошибка при поиске:", error);
    }
}

// вывод найденного
function showResults(results) {
    resultsList.innerHTML = "";

    if (!results || results.length === 0) {
        resultsList.innerHTML = `<li class="list_search_item">Ничего не найдено</li>`;
        resultsList.classList.add("active");
        return;
    }

    results.forEach(item => {
        const li = document.createElement("li");
        li.classList.add("list_search_item");
        li.textContent = item.title;

        li.addEventListener("click", () => {
            window.location.href = `/player/${item.type}/${item.id}`;
        });
        console.log('Search result item:', item.type);

        resultsList.appendChild(li);
    });

    resultsList.classList.add("active");
}

// чтобы скрывало результат поиска при клике в другое место
document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !resultsList.contains(e.target)) {
        resultsList.classList.remove("active");
    }
});
