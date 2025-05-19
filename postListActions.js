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

function typeTextSlowly(element, text, onComplete, delay = 100) {
    let index = 0;

    function typeNext() {
        if (index < text.length) {
            element.value += text[index];
            element.dispatchEvent(new Event("input", { bubbles: true }));
            index++;
            setTimeout(typeNext, delay);
        } else {
            console.log("✅ Finished typing:", text);
            if (typeof onComplete === "function") onComplete();
        }
    }

    element.value = ""; // Clear field before typing
    element.focus();
    typeNext();
}

console.log("🛬 postListActions.js loaded");
console.log("📛 contractorNameFromExtension:", window.contractorNameFromExtension);
console.log("📧 contractorEmailFromExtension:", window.contractorEmailFromExtension);
console.log("📦 contractorTypeFromExtension:", window.contractorTypeFromExtension);

console.log("👀 Looking for Share button...");
waitForElement("button.share-btn", (shareButton) => {
    shareButton.click();
    console.log("🖱️ Clicked share button");
    
    waitForElement("input.cu-search-input__input:nth-child(2)", (input) => {
        console.log("⌨️ Found input field, typing email...");
        

        const email = window.contractorEmailFromExtension || "test@example.com";
        console.log("📧 Email to type:", email);

        
        typeTextSlowly(input, email, () => {
        console.log("🔽 Typing complete, pressing Enter");
        setTimeout(() => {
            console.log("🔍 Waiting for suggested email to appear...");
        
            waitForElement("div.cu-privacy-settings__suggested-email", (suggestedEmailDiv) => {
                suggestedEmailDiv.click();
                console.log("🖱️ Clicked suggested email option");
            
                // 🔁 Proceed to click the custom role element instead of the dropdown icon
                waitForElement(".cu-custom-roles-dropdown__detailed-version-content-header > p", (roleElement) => {
                    if (roleElement && typeof roleElement.click === "function") {
                        roleElement.click();
                        console.log("🎛️ Clicked custom role paragraph");
            
                        waitForElement(".cu-dropdown-list-item:nth-child(3) > .cu-dropdown-list-item__link-container", (guestRole) => {
                            guestRole.click();
                            console.log("👥 Selected Guest role");
            
                            waitForElement("button.cu-invite-guests__invite-button", (inviteBtn) => {
                                inviteBtn.click();
                                console.log("📨 Clicked Invite button");
            
                                const div = document.createElement("div");
                                div.style = `
                                    position: fixed;
                                    bottom: 20px;
                                    right: 20px;
                                    z-index: 9999;
                                    background: #17a2b8;
                                    color: white;
                                    padding: 10px 20px;
                                    font-size: 14px;
                                    border-radius: 6px;
                                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                                `;
                                div.innerText = `🎉 ${window.contractorNameFromExtension || "Contractor"} was invited successfully!`;
                                document.body.appendChild(div);
                                setTimeout(() => div.remove(), 5000);
                                
                                // 🔁 New Sequence
                                waitForElement("button.cu-share-entity__close", (closeBtn) => {
                                    closeBtn.click();
                                    console.log("❎ Closed Share modal");

                                    // ✅ Copy current URL to clipboard
                                    const listUrl = window.location.href;
                                    navigator.clipboard.writeText(listUrl).then(() => {
                                        console.log("🔗 List URL copied to clipboard:", listUrl);

                                        // ✅ Show toast notification
                                        const div = document.createElement("div");
                                        div.style = `
                                            position: fixed;
                                            bottom: 20px;
                                            right: 20px;
                                            z-index: 9999;
                                            background: #6f42c1;
                                            color: white;
                                            padding: 10px 20px;
                                            font-size: 14px;
                                            border-radius: 6px;
                                            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                                        `;
                                        div.innerText = `📋 List URL copied to clipboard`;
                                        document.body.appendChild(div);
                                        setTimeout(() => div.remove(), 5000);
                                    }).catch((err) => {
                                        console.error("❌ Failed to copy URL:", err);
                                    });

                                }, "❌ Close button not found");


                            }, "❌ Could not find Invite button");
            
                        }, "❌ Could not find Guest role option");
                    } else {
                        console.warn("❌ Custom role paragraph is not clickable:", roleElement);
                    }
            
                }, "❌ Could not find custom role paragraph");
            
            }, "❌ Suggested email option not found");
            
        
        }, 1000); // Delay after typing
        });
    }, "Could not find search input");
}, "Could not find share button");
