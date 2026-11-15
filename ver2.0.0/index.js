// Apply one selected image, preferring the extension-loaded copy when available.
(() => {
    const controllerVersion = 3;
    if (window.__arisuchanControllerVersion === controllerVersion) return;

    if (window.__arisuchanInterval) {
        clearInterval(window.__arisuchanInterval);
    }
    window.__arisuchanControllerVersion = controllerVersion;

    const defaultImageUrl = globalThis.ARISUCHAN_IMAGES[0]?.url || "";
    const errorHandlers = new WeakMap();
    let isActive = false;
    let activeImageUrl = defaultImageUrl;
    let activeImageDataUrl = "";
    let useOriginalUrl = false;

    function getReplacementUrl() {
        return activeImageDataUrl && !useOriginalUrl
            ? activeImageDataUrl
            : activeImageUrl;
    }

    function applyImage() {
        const imageUrl = getReplacementUrl();
        if (!isActive || !imageUrl) return;

        document.querySelectorAll("img").forEach((img) => {
            img.loading = "eager";
            img.referrerPolicy = "no-referrer";
            img.removeAttribute("crossorigin");

            const picture = img.closest("picture");
            if (picture) {
                picture.querySelectorAll("source").forEach((source) => {
                    source.removeAttribute("srcset");
                    source.removeAttribute("sizes");
                });
            }

            img.removeAttribute("srcset");
            img.removeAttribute("sizes");

            if (img.getAttribute("src") !== imageUrl) {
                const oldHandler = errorHandlers.get(img);
                if (oldHandler) {
                    img.removeEventListener("error", oldHandler);
                    errorHandlers.delete(img);
                }

                if (activeImageDataUrl && !useOriginalUrl) {
                    const onDataImageError = () => {
                        if (!useOriginalUrl) {
                            useOriginalUrl = true;
                            applyImage();
                        }
                    };
                    errorHandlers.set(img, onDataImageError);
                    img.addEventListener("error", onDataImageError, { once: true });
                }

                img.setAttribute("src", imageUrl);
            }
        });

        document.querySelectorAll("*").forEach((element) => {
            if (getComputedStyle(element).backgroundImage !== "none") {
                const escapedUrl = imageUrl.replaceAll('"', "%22");
                const nextBackground = `url("${escapedUrl}")`;
                if (element.style.backgroundImage !== nextBackground) {
                    element.style.backgroundImage = nextBackground;
                }
            }
        });
    }

    chrome.storage.local.get(
        ["isActive", "activeImageUrl", "activeImageDataUrl"],
        (settings) => {
            isActive = Boolean(settings.isActive);
            activeImageUrl = settings.activeImageUrl || defaultImageUrl;
            activeImageDataUrl = settings.activeImageDataUrl || "";
            useOriginalUrl = false;
            applyImage();
        }
    );

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") return;

        if (changes.isActive) {
            isActive = Boolean(changes.isActive.newValue);
        }

        let imageChanged = false;
        if (changes.activeImageUrl) {
            activeImageUrl = changes.activeImageUrl.newValue || defaultImageUrl;
            imageChanged = true;
        }
        if (changes.activeImageDataUrl) {
            activeImageDataUrl = changes.activeImageDataUrl.newValue || "";
            imageChanged = true;
        }
        if (imageChanged) useOriginalUrl = false;

        applyImage();
    });

    window.__arisuchanInterval = setInterval(applyImage, 500);
})();
