const imageList = document.getElementById("imageList");
const imageUrlInput = document.getElementById("imageUrlInput");
const applyForm = document.getElementById("applyForm");
const statusText = document.getElementById("status");
const stopButton = document.getElementById("stopButton");
const message = document.getElementById("message");

let selectedImageUrl = "";
let activeImageUrl = "";
let isActive = false;

function isHttpUrl(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    try {
        const url = new URL(value.trim());
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

function isPresetImage(url) {
    return globalThis.ARISUCHAN_IMAGES.some((image) => image.url === url);
}

async function fetchImageAsDataUrl(url) {
    const parsedUrl = new URL(url);
    const hostPattern = `${parsedUrl.protocol}//${parsedUrl.hostname}/*`;
    const hasAccess = await chrome.permissions.request({ origins: [hostPattern] });
    if (!hasAccess) {
        throw new Error("Chrome에서 이미지 서버 접근 권한을 허용해 주세요.");
    }

    const response = await fetch(url, {
        credentials: "omit",
        referrerPolicy: "no-referrer"
    });
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("이미지 서버에서 파일을 찾지 못했습니다 (404). 주소가 잘못됐거나 이미지가 이동·삭제됐을 수 있습니다. 원본 페이지에서 새 이미지 주소를 복사해 주세요.");
        }
        throw new Error(`이미지 서버 응답 오류: HTTP ${response.status}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) {
        throw new Error("이미지 파일이 비어 있습니다.");
    }
    if (blob.size > 4 * 1024 * 1024) {
        throw new Error("이미지가 4MB보다 큽니다. 더 작은 이미지 주소를 사용해 주세요.");
    }

    const blobUrl = URL.createObjectURL(blob);
    try {
        await new Promise((resolve, reject) => {
            const preview = new Image();
            preview.onload = resolve;
            preview.onerror = () => reject(new Error(
                "주소가 직접 이미지 파일이 아니거나, 이미지 서버가 파일 전달을 거부했습니다."
            ));
            preview.src = blobUrl;
        });
    } finally {
        URL.revokeObjectURL(blobUrl);
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("이미지 파일을 읽지 못했습니다."));
        reader.readAsDataURL(blob);
    });
}

function renderImages() {
    imageList.replaceChildren();
    const hasCustomInput = Boolean(imageUrlInput.value.trim());

    globalThis.ARISUCHAN_IMAGES.forEach((image, index) => {
        const item = document.createElement("li");
        item.className = "image-item";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "selectedImage";
        radio.value = image.url;
        radio.checked = !hasCustomInput && image.url === selectedImageUrl;
        radio.setAttribute("aria-label", `이미지 선택: ${image.name}`);
        radio.addEventListener("change", async () => {
            selectedImageUrl = image.url;
            imageUrlInput.value = "";
            message.textContent = "";
            await chrome.storage.local.set({ selectedImageUrl });
            renderImages();
        });

        const preview = document.createElement("img");
        preview.className = "image-preview";
        preview.referrerPolicy = "no-referrer";
        preview.loading = "eager";
        preview.src = image.url;
        preview.alt = "";

        const name = document.createElement("span");
        name.textContent = `${index + 1}. ${image.name}`;

        item.addEventListener("click", (event) => {
            if (event.target !== radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event("change"));
            }
        });

        item.append(radio, preview, name);
        imageList.append(item);
    });
}


//여기도 한 번 검사


function updateUI() {
    const activeImage = globalThis.ARISUCHAN_IMAGES.find(
        (image) => image.url === activeImageUrl
    );

    statusText.innerHTML = isActive
        ? `상태: <strong>활성</strong> — ${activeImage?.name || "사용자 이미지"}`
        : "상태: <strong>비활성</strong>";
    stopButton.hidden = !isActive;
}

async function initialize() {
    const settings = await chrome.storage.local.get([
        "isActive",
        "selectedImageUrl",
        "activeImageUrl"
    ]);

    const firstImageUrl = globalThis.ARISUCHAN_IMAGES[0]?.url || "";
    isActive = Boolean(settings.isActive);

    if (isPresetImage(settings.selectedImageUrl)) {
        selectedImageUrl = settings.selectedImageUrl;
    } else if (isHttpUrl(settings.selectedImageUrl)) {
        selectedImageUrl = settings.selectedImageUrl;
        imageUrlInput.value = settings.selectedImageUrl;
    } else {
        selectedImageUrl = firstImageUrl;
    }

    activeImageUrl = isHttpUrl(settings.activeImageUrl)
        ? settings.activeImageUrl
        : selectedImageUrl;

    const savedSettings = { selectedImageUrl };
    if (isActive && activeImageUrl !== settings.activeImageUrl) {
        savedSettings.activeImageUrl = activeImageUrl;
    }
    await chrome.storage.local.set(savedSettings);

    renderImages();
    updateUI();
}

//여기도 (없을 것 같긴함)

imageUrlInput.addEventListener("input", () => {
    message.textContent = "";

    if (imageUrlInput.value.trim()) {
        imageList.querySelectorAll('input[name="selectedImage"]').forEach((radio) => {
            radio.checked = false;
        });
        return;
    }

    if (!isPresetImage(selectedImageUrl)) {
        selectedImageUrl = globalThis.ARISUCHAN_IMAGES[0]?.url || "";
        chrome.storage.local.set({ selectedImageUrl });
    }
    renderImages();
});

applyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const customUrl = imageUrlInput.value.trim();
    const imageUrl = customUrl || selectedImageUrl;
    if (!isHttpUrl(imageUrl)) {
        message.textContent = "http 또는 https 이미지 URL을 입력해 주세요.";
        return;
    }

    let activeImageDataUrl = "";
    if (!isPresetImage(imageUrl)) {
        try {
            activeImageDataUrl = await fetchImageAsDataUrl(imageUrl);
        } catch (error) {
            message.textContent = error.message || "이미지 주소에서 파일을 가져오지 못했습니다.";
            return;
        }
    }

    selectedImageUrl = imageUrl;
    activeImageUrl = imageUrl;
    isActive = true;
    try {
        await chrome.storage.local.set({
            isActive,
            selectedImageUrl,
            activeImageUrl,
            activeImageDataUrl
        });
    } catch {
        message.textContent = "이미지를 저장하지 못했습니다. 이미지 크기가 너무 큰지 확인해 주세요.";
        return;
    }
    renderImages();
    updateUI();
    message.textContent = "";

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id !== undefined) {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["images.js", "index.js"]
            });
        }
    } catch {
        message.textContent = "현재 탭에는 확장 프로그램을 적용할 수 없습니다.";
    }
});

stopButton.addEventListener("click", async () => {
    isActive = false;
    await chrome.storage.local.set({ isActive });
    updateUI();
});

initialize().catch(() => {
    message.textContent = "확장 프로그램 설정을 불러오지 못했습니다.";
});
