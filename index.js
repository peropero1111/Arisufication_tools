// 실행 상태를 확인하여 조건에 따라 실행
chrome.storage.local.get("isActive", (result) => {
    if (!result.isActive) return; // 비활성화 상태라면 실행하지 않음

    // interval ID를 전역 변수에 저장하여 이후 clearInterval로 중지 가능
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
