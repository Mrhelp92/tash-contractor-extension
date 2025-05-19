function waitForElement(selector, callback, errorMessage, maxAttempts = 10, interval = 500, isXPath = false) {
    let attempts = 0;

    const checkElement = () => {
        let element = isXPath
            ? document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
            : document.querySelector(selector);

        if (element) {
            console.log(`✅ Found: ${selector}`);
            callback(element);
            return;
        }

        if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkElement, interval);
        } else {
            console.log(`❌ ${errorMessage}`);
        }
    };

    checkElement();
}

function showInPagePopup(message, success = true) {
    const popup = document.createElement("div");
    popup.textContent = message;

    popup.style.position = "fixed";
    popup.style.bottom = "20px";
    popup.style.right = "20px";
    popup.style.padding = "12px 20px";
    popup.style.backgroundColor = success ? "#4CAF50" : "#f44336";
    popup.style.color = "#fff";
    popup.style.fontSize = "14px";
    popup.style.borderRadius = "8px";
    popup.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    popup.style.zIndex = 99999;
    popup.style.opacity = "0";
    popup.style.transition = "opacity 0.3s ease-in-out";

    document.body.appendChild(popup);
    setTimeout(() => (popup.style.opacity = "1"), 10);

    setTimeout(() => {
        popup.style.opacity = "0";
        setTimeout(() => popup.remove(), 300);
    }, 3000);
}

async function sendToAPI(payload) {
    try {
        console.log("📤 Sending to external API:", payload);
        let response = await fetch("https://abdelrahman-atm-tash-contractors.hf.space", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        let result = await response.json();
        console.log("📡 API Response:", result);
    } catch (error) {
        console.error("❌ API Error:", error);
    }
}

async function verifyContractorAdded(contractorName) {
    const apiKey = "2585415_877e3999ec927cff5d896269c348106949c50f9b8ad54fdaeac07ad00687ce3e";
    const contractorType = window.contractorTypeFromExtension?.toLowerCase();

    const customFieldId = contractorType === "image contractor"
    ? "0acae2e5-a4ae-4aaf-859f-c705051c882c"  // ⬅️ Replace with actual field ID
    : "d7d4ac40-fe3e-45ac-bcb5-08e535283361";
    
    const listId = contractorType === "image contractor"
        ? "901803812407"
        : "901803812375";

    console.log("🔎 Fetching first task from list:", listId);

    try {
        // Step 1: Fetch first task in the list
        const taskRes = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?page=0&archived=false&include_closed=true&subtasks=true&include_markdown_description=true`, {
            headers: {
                Authorization: apiKey,
                "Content-Type": "application/json"
            }
        });

        const taskData = await taskRes.json();
        const firstTask = taskData.tasks?.[0];

        if (!firstTask) {
            console.warn("⚠️ No tasks found in this list.");
            sendToAPI({ status: "no_task_found", listId, contractorType });
            return;
        }

        const taskId = firstTask.id;
        console.log("📥 First task ID:", taskId);

        // Step 2: Fetch task details and verify contractor
        const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
            headers: { Authorization: apiKey }
        });

        const data = await res.json();
        console.log("📥 Fetched task data:", data);

        const field = data.custom_fields.find(f => f.id === customFieldId);
        if (!field || !field.type_config?.options) {
            console.warn("⚠️ Custom field not found or invalid");
            sendToAPI({ status: "field_not_found", name: contractorName });
            return;
        }

        console.log("🔍 Searching options in custom field...");
        const found = field.type_config.options.some(opt => opt.name.toLowerCase() === contractorName.toLowerCase());

        if (found) {
            console.log(`✅ Contractor "${contractorName}" was found in options.`);
            showInPagePopup(`✅ "${contractorName}" was added to ClickUp!`, true);
            console.log("📤 Sending contractorInjectionResult with data:", {
                status: "success",
                contractorName: contractorName,
                contractorType: window.contractorTypeFromExtension,
                contractorEmail: window.contractorEmailFromExtension,
                tabId: window.tabId || null
            });
            chrome.runtime.sendMessage({
                action: "contractorInjectionResult",
                status: "success",
                contractorName: contractorName,
                contractorType: window.contractorTypeFromExtension,
                contractorEmail: window.contractorEmailFromExtension,
                tabId: window.tabId || null
            });

            const contractorData = {
                contractorName: contractorName,
                contractorType: window.contractorTypeFromExtension,
                contractorEmail: window.contractorEmailFromExtension,
                tabId: window.tabId || null
            };
            // 🔁 Also send to backend
            fetch("https://mr-help-tash-create-contractor-list.hf.space/registerContractor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contractorData)
            })
            .then(res => res.json())
            .then(data => console.log("📡 Sent to /registerContractor:", data))
            .catch(err => console.error("❌ Failed to send to /registerContractor:", err));

            sendToAPI({ status: "success", data: contractorName });
        } else {
            console.warn(`❌ Contractor "${contractorName}" was NOT found.`);
            showInPagePopup(`❌ "${contractorName}" was not found in field`, false);

            chrome.runtime.sendMessage({
                action: "contractorInjectionResult",
                status: "failure",
                contractorName: contractorName,
                contractorType: window.contractorTypeFromExtension,
                contractorEmail: window.contractorEmailFromExtension,
                tabId: window.tabId || null
            });

            sendToAPI({ status: "failure", data: "Option not found" });
        }
    } catch (err) {
        console.error("🚨 Verification error:", err);
        sendToAPI({ status: "verification_failed", error: err.message });
    }
}

waitForElement("span.cu2-views-bar__controller-btn__text", (element) => {
    console.log("✅ Clicked Customize button");
    element.click();

    waitForElement(".ng-star-inserted:nth-child(2) > .field-button > .field-button__trailing [data-testid='icon']", (secondButton) => {
        if (!secondButton || typeof secondButton.click !== "function") {
            console.log("❌ Fields button is not clickable. Trying to click parent...");
            secondButton = secondButton?.closest('.field-button');
        }

        if (secondButton && typeof secondButton.click === "function") {
            console.log("✅ Fields button was found and clicked");
            secondButton.click();

            const contractorLabel = window.contractorTypeFromExtension || "Video Contractor";

            waitForElement(`//div[contains(@class, 'cu-fields-list-group__body-item-title') and contains(text(), '${contractorLabel}s')]`,
                (videoContractorsField) => {
                    if (videoContractorsField) {
                        console.log(`✅ Found '${contractorLabel}s' field`);

                        let editButtonXPath = `//div[contains(@class, 'cu-fields-list-group__body-item-title') and contains(text(), '${contractorLabel}s')]/following::button[contains(@class, 'cu-fields-list-group__body-item-actions-edit--button')][1]`;
                        waitForElement(editButtonXPath, (editButton) => {
                            if (editButton) {
                                console.log(`✅ Clicked Edit button for '${contractorLabel}s'`);
                                editButton.click();
                                console.log("⏳ Waiting for sidebar to finish opening...");

                                // ✅ Wait for sidebar first, THEN wait for Add Option button
                                waitForElement("cu-custom-field-edit-popover.custom-fields-manager__cfm-mini", (sidebar) => {
                                    console.log("✅ Sidebar loaded");
                                    setTimeout(() => {
                                    waitForElement("button[data-test='specific-for-dropdown__add-option']", (addOptionButton) => {
                                        if (addOptionButton) {
                                            console.log("✅ Clicked 'Add option' button");
                                            addOptionButton.click();

                                            waitForElement(".cdk-drag.right-sidebar__option-container.new-option.ng-star-inserted input", (inputField) => {
                                                if (inputField) {
                                                    let contractorName = window.contractorNameFromExtension || "Default Name";
                                                    inputField.value = contractorName;
                                                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                                                    console.log(`✅ Typed "${contractorName}" into the input field`);

                                                    setTimeout(() => {
                                                        let enterEvent = new KeyboardEvent("keydown", {
                                                            key: "Enter",
                                                            code: "Enter",
                                                            keyCode: 13,
                                                            which: 13,
                                                            bubbles: true
                                                        });
                                                        inputField.dispatchEvent(enterEvent);
                                                        console.log("✅ Pressed Enter");

                                                        setTimeout(() => {
                                                            verifyContractorAdded(contractorName);
                                                        }, 2000);

                                                    }, 500);
                                                } else {
                                                    console.log("❌ New option input field not found.");
                                                    sendToAPI({ status: "failure", data: "Option field wasn't found" });
                                                }
                                            }, "New option input field not found", 30, 500);
                                        } else {
                                            console.log("❌ 'Add option' button not found.");
                                            showInPagePopup("❌ Add option not found. Restarting...", false);

                                            sendToAPI({
                                                status: "add_option_not_found",
                                                context: "Restarting ClickUp process"
                                            });

                                            chrome.runtime.sendMessage({
                                                action: "openClickUpPage",
                                                name: window.contractorNameFromExtension,
                                                email: window.contractorEmailFromExtension,
                                                type: window.contractorTypeFromExtension
                                            });
                                        }
                                    }, "'Add option' button not found", 30, 500);
                                    }, 3000);
                                }, "The Sidebar wasnot found", 30, 500);

                            } else {
                                console.log(`❌ Edit button for '${contractorLabel}s' not found.`);
                            }
                        }, `Edit button for '${contractorLabel}s' not found`, 10, 500, true);

                    } else {
                        console.log(`❌ '${contractorLabel}s' field wasn't found. Restarting...`);

                        showInPagePopup(`❌ '${contractorLabel}s' field not found. Restarting...`, false);

                        sendToAPI({
                            status: "field_not_found",
                            fieldName: `${contractorLabel}s`,
                            context: "Restarting ClickUp process"
                        });

                        chrome.runtime.sendMessage({
                            action: "openClickUpPage",
                            name: window.contractorNameFromExtension,
                            email: window.contractorEmailFromExtension,
                            type: window.contractorTypeFromExtension
                        });
                    }
                },
                `'${contractorLabel}s' field wasn't found`,
                30,
                500,
                true
            );

        } else {
            console.log("❌ Fields button still not clickable");
        }
    }, "Fields button not found");
}, "Customize button not found");