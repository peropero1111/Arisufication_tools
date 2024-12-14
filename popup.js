let isActive = false; // 상태 추적 변수

// 버튼 클릭 이벤트
document.getElementById("toggleButton").addEventListener("click", () => {
    chrome.storage.local.set({ isActive: !isActive }, () => {
        isActive = !isActive;
        updateUI();
        if (isActive) {
            activateScript();
        } else {
            deactivateScript();
        }
    });
});

// 활성화 스크립트 실행
function activateScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["index.js"]
        });
    });
}

// 비활성화 스크립트 실행
function deactivateScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => clearInterval(window.customInterval)
        });
    });
}

// UI 업데이트 함수
function updateUI() {
    const statusText = document.getElementById("status");
    const toggleButton = document.getElementById("toggleButton");

    if (isActive) {
        statusText.innerHTML = "Status: <strong>Active</strong>";
        toggleButton.textContent = "Deactivate";
    } else {
        statusText.innerHTML = "Status: <strong>Inactive</strong>";
        toggleButton.textContent = "Activate";
    }
}

// 확장 프로그램 로드 시 상태 확인 및 초기화
chrome.storage.local.get("isActive", (result) => {
    isActive = result.isActive || false;
    updateUI();
});

