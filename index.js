chrome.storage.local.get("isActive", (result) => {
    if (!result.isActive) return; 

    window.customInterval = setInterval(() => {
        let imgs = document.querySelectorAll('img');
        imgs.forEach((a) => {
            a.src = 'https://moewalls.com/wp-content/uploads/2024/09/tendou-alice-blue-archive-thumb.jpg';
        });

        document.querySelectorAll('*').forEach((el) => {
            const checkBgImage = getComputedStyle(el).backgroundImage !== "none";
            if (checkBgImage) {
                el.style.backgroundImage = 'url("https://moewalls.com/wp-content/uploads/2024/09/tendou-alice-blue-archive-thumb.jpg")';
            }
        });
    }, 500);
});
