console.log("✅ Script running!");
function waitForElement(selector, callback, errorMessage = '', maxTries = 20, interval = 500) {
    let attempts = 0;
    const timer = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
            clearInterval(timer);
            console.log("✅ Found:", selector);
            callback(el);
        } else if (attempts >= maxTries) {
            clearInterval(timer);
            console.warn("❌", errorMessage || `Failed to find ${selector}`);
        }
        attempts++;
    }, interval);
}

function runRemoveFlow() {
    console.log("⏳ Waiting before starting remove logic...");

    setTimeout(() => {
        console.log("👀 Looking for cu-ellipsis-button...");
        waitForElement("cu-ellipsis-button", (ellipsisButton) => {
            ellipsisButton.click();
            console.log("🖱️ Clicked cu-ellipsis-button");

            waitForElement("a.nav-menu-item_archive-ungarchive", (archiveBtn) => {
                archiveBtn.click();
                console.log("🗂️ Clicked archive/unarchive menu item");

                // Delay message to background script slightly
                setTimeout(() => {
                    chrome.runtime.sendMessage({
                        action: "openUserSettingsTab"
                    });
                }, 1000); // Give UI time to complete any transitions

            }, "❌ Archive/Unarchive menu item not found");

        }, "❌ Ellipsis button not found");
    }, 3000);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runRemoveFlow);
} else {
    runRemoveFlow();
}

