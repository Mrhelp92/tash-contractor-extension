console.log("✅ Members Script running!");

const contractorName = window.contractorNameFromExtension || "Unknown";
const contractorType = window.contractorTypeFromExtension || "Unknown";

console.log("🔍 Received contractor name for removal:", contractorName);
console.log("🔍 Contractor type:", contractorType);

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

function showToast(message, color = "#28a745") {
    const div = document.createElement("div");
    div.textContent = message;
    div.style = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: bold;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 99999;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
    `;
    document.body.appendChild(div);
    setTimeout(() => (div.style.opacity = "1"), 10);
    setTimeout(() => {
        div.style.opacity = "0";
        setTimeout(() => div.remove(), 300);
    }, 3000);
}


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

function runMemberFlow() {
    console.log("🚀 Running user settings automation...");

    waitForElement(".cu-tms-nav > .cu-tms-nav__item:nth-child(2)", (btn) => {
        btn.click();
        console.log("👆 Clicked nav item");

        waitForElement("input.cu-search__input", (input) => {
            input.focus();
            input.click();
            console.log("⌨️ Focused and clicked search input");

            // 👇 Now type the contractor name automatically
            // 👇 Now fetch the email and type it instead of the name
            fetch("https://abdelrahman-atm-tash-remove-contractors.hf.space/retrieveEmail", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: contractorName })
            })
            .then(res => res.json())
            .then(data => {
                const contractorEmail = data?.email || contractorName; // fallback to name
                console.log("📩 Retrieved contractor email:", contractorEmail);

                typeTextSlowly(input, contractorEmail, () => {
                    console.log("🖋️ Email typed into search field:", contractorEmail);

                    // Step 1: Click the dropdown toggle
                    waitForElement(".cu-dropdown__toggle.cu-tms-user-settings-list__ellipsis", (dropdownBtn) => {
                        dropdownBtn.click();
                        console.log("🧩 Clicked dropdown toggle");

                        // Step 2: Wait for the menu items
                        waitForElement("a.cu-tms-user-settings-list__item", () => {
                            const item2 = document.querySelector("a.cu-tms-user-settings-list__item:nth-child(2)");
                            const item3 = document.querySelector("a.cu-tms-user-settings-list__item:nth-child(3)");

                            const item2Text = item2?.innerText?.trim().toLowerCase() || "";
                            const item3Text = item3?.innerText?.trim().toLowerCase() || "";

                            console.log("🔍 Item 2 text:", item2Text);
                            console.log("🔍 Item 3 text:", item3Text);

                            if (item2Text === "cancel invite" && typeof item2.click === "function") {
                                item2.click();
                                console.log("✅ Clicked 'Cancel Invite' (Item 2)");
                                showToast(`✅ ${contractorName}'s invite was canceled successfully!`);
                            } else if (item3Text === "remove" && typeof item3.click === "function") {
                                item3.click();
                                console.log("✅ Clicked 'Remove' (Item 3)");
                                waitForElement("button", (btn) => {
                                    const allButtons = Array.from(document.querySelectorAll("button"));
                                    const removeBtn = allButtons.find(
                                        b => b.textContent?.trim().toLowerCase() === "remove"
                                    );

                                    if (removeBtn) {
                                        removeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                                        console.log("🟥 Clicked final confirm 'Remove' button");

                                        showToast(`✅ ${contractorName} was fully removed!`);
                                    } else {
                                        console.warn("❌ Could not find confirm 'Remove' button in modal.");
                                    }
                                }, "❌ Confirm 'Remove' modal button not found", 20, 500);
                            } else {
                                console.warn("❌ Neither 'Cancel Invite' nor 'Remove' found.");
                            }
                        }, "❌ User menu items not found");

                    }, "❌ Dropdown icon not found");
                });
            })
            .catch(err => {
                console.error("❌ Failed to fetch email from backend:", err);
                showToast("❌ Could not fetch email", "#f44336");
            });

        }, "❌ Search input not found");


    }, "❌ Active nav item not found");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runMemberFlow);
} else {
    runMemberFlow();
}
