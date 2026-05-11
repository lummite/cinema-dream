// ограничение количества блоков content в строке
function limitContentBlocks() {
    const contentSections = document.querySelectorAll('.content');

    contentSections.forEach(section => {
        const blocks = section.querySelectorAll('.content__block');
        let maxBlocks = blocks.length;

        // Определяем медиазапрос через matchMedia
        if (window.matchMedia("(max-width: 430px) and (orientation: portrait)").matches) {
            maxBlocks = 4;
        } else if (window.matchMedia("(min-width: 431px) and (max-width: 932px) and (orientation: landscape)").matches) {
            maxBlocks = 5;
        } else if (window.matchMedia("(min-width: 431px) and (max-width: 768px) and (orientation: portrait)").matches) {
            maxBlocks = 6;
        } else if (window.matchMedia("(min-width: 1024px) and (max-width: 1365px) and (orientation: landscape)").matches) {
            maxBlocks = 8;
        }else if (window.matchMedia("(min-width: 1366px)").matches) {
            maxBlocks = 6;
        }

        // Показываем/скрываем блоки
        blocks.forEach((block, index) => {
            block.style.display = index < maxBlocks ? 'flex' : 'none';
        });
    });
}

window.addEventListener('load', limitContentBlocks);
window.addEventListener('resize', limitContentBlocks);
