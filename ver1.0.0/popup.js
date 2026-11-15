let isActive = false; 

document.getElementById("toggleButton").addEventListener("click", () => {
    chrome.storage.local.set({ isActive: !isActive }, () => {
        isActive = !isActive; /*초기 실행시 기존값 불러옴 (storage.local 에 기존에 저장된 값 사용)*/
        updateUI();
        if (isActive) {
            activateScript();
        } else {
            deactivateScript();
        }
    });
});  /*비활성&활성 상태 저장(storage.local 사용)*/

function activateScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["index.js"]
        });
    });
}

function deactivateScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => clearInterval(window.customInterval)
        });
    });
}

function updateUI() {
    const statusText = document.getElementById("status");
    const toggleButton = document.getElementById("toggleButton");

    if (isActive) {
        statusText.innerHTML = "Status: <strong>Active</strong>";
        toggleButton.textContent = "Deactivate";
    } else {
        statusText.innerHTML = "Status: <strong>Inactive</strong>";
        toggleButton.textContent = "Activate"; /*변경 상태 저장*/
    }
}

chrome.storage.local.get("isActive", (result) => {
    isActive = result.isActive || false;
    updateUI();
});

