let retryCount = 0;
const MAX_RETRIES = 1;
let lastUsedContractorEmail = null;
let contractorNameForRemoval = null;
let contractorTypeForRemoval = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("🔹 Received message:", request);

    if (request.action === "openClickUpPage") {
        if (request.type === "Video Contractor") {
            lastUsedContractorEmail = request.email;
            chrome.tabs.create({ url: "https://app.clickup.com/9018441024/v/l/li/901803812375" }, (tab) => {
                console.log("📌 Opened ClickUp tab:", tab.id);
                console.log("📦 Injecting vars:", {
                    name: request.name,
                    email: request.email,
                    type: request.type,
                    tabId: tab.id
                });
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (name, email, type, tabId) => {
                        window.contractorNameFromExtension = name;
                        window.contractorEmailFromExtension = email;
                        window.contractorTypeFromExtension = type;
                        window.tabId = tabId;
                    },
                    args: [request.name, request.email, request.type, tab.id]
                }, () => {
                    console.log("✅ Contractor variables (incl. tabId) set in page.");

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ["content.js"]
                    }, () => {
                        console.log("✅ content.js injected.");
                    });
                });
            });
        } else if (request.type === "Image Contractor") {
            lastUsedContractorEmail = request.email;
            chrome.tabs.create({ url: "https://app.clickup.com/9018441024/v/l/6-901803812407-1?pr=90182086710" }, (tab) => {
                console.log("📌 Opened Image Contractor ClickUp tab:", tab.id);
                console.log("📦 Injecting vars:", {
                    name: request.name,
                    email: request.email,
                    type: request.type,
                    tabId: tab.id
                });
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (name, email, type, tabId) => {
                        window.contractorNameFromExtension = name;
                        window.contractorEmailFromExtension = email;
                        window.contractorTypeFromExtension = type;
                        window.tabId = tabId;
                    },
                    args: [request.name, request.email, request.type, tab.id]
                }, () => {
                    console.log("✅ Contractor variables (incl. tabId) set in page.");

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ["content.js"]
                    }, () => {
                        console.log("✅ content.js injected for Image Contractor.");
                    });
                });
            });
        }
    }

    else if (request.action === "contractorInjectionResult") {
        const { status, contractorName, tabId, contractorType, contractorEmail } = request;

        if (status === "success") {
            console.log(`✅ Contractor "${contractorName}" added successfully.`);
            retryCount = 0;

            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (name) => {
                    const div = document.createElement('div');
                    div.style = `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 9999;
                        background: #28a745;
                        color: white;
                        padding: 10px 20px;
                        font-size: 14px;
                        border-radius: 6px;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                    `;
                    div.innerText = `✅ ${name} was added successfully!`;
                    document.body.appendChild(div);
                    setTimeout(() => div.remove(), 4000);
                },
                args: [contractorName]
            });

            const contractorType = request.contractorType?.toLowerCase().includes("image") ? "image" : "video";
            createListFromBackend(contractorName, contractorType.toLowerCase(), (listUrl) => {
                if (listUrl) {
                    console.log("🔗 Opening new list tab:", listUrl);
                    chrome.tabs.create({ url: listUrl }, (newTab) => {
                        const tabId = newTab.id;

                        chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
                            if (updatedTabId === tabId && changeInfo.status === "complete") {
                                console.log("✅ New list tab fully loaded.");
                                console.log("Type before injections is: ", contractorType);
                                chrome.scripting.executeScript({
                                    target: { tabId: tabId },
                                    func: (name, email, type) => {
                                        window.contractorNameFromExtension = name;
                                        window.contractorEmailFromExtension = email;
                                        window.contractorTypeFromExtension = type;
                                    },
                                    args: [contractorName, lastUsedContractorEmail, contractorType]
                                }, () => {
                                    console.log("📦 Variables re-injected into new tab");

                                    chrome.scripting.executeScript({
                                        target: { tabId: tabId },
                                        files: ["postListActions.js"]
                                    }, () => {
                                        console.log("✅ postListActions.js injected");
                                    });
                                });

                                chrome.tabs.onUpdated.removeListener(listener);
                            }
                        });

                    });
                    console.log("📤 Preparing to send to Google Sheet:", {
                        name: contractorName,
                        email: contractorEmail,
                        type: contractorType
                    });
                    
                } else {
                    console.warn("⚠️ List creation failed. No link to display.");
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: () => {
                            const errorDiv = document.createElement('div');
                            errorDiv.style = `
                                position: fixed;
                                top: 70px;
                                right: 20px;
                                z-index: 9999;
                                background: #dc3545;
                                color: white;
                                padding: 10px 20px;
                                font-size: 14px;
                                border-radius: 6px;
                                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                            `;
                            errorDiv.innerText = "❌ Failed to create contractor list.";
                            document.body.appendChild(errorDiv);
                            setTimeout(() => errorDiv.remove(), 5000);
                        }
                    });
                }

            });
            
                    
        } else {
            console.warn(`❌ Contractor add failed for "${contractorName}".`);

            if (retryCount < MAX_RETRIES) {
                retryCount++;
                console.log("🔁 Retrying injection...");

                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ["content.js"]
                }, () => {
                    console.log("✅ Retried injection of content.js.");
                });
            } else {
                console.error("⛔ Max retries reached. Aborting.");
                retryCount = 0;
            }
        }
    }

    else if (request.action === "fetchContractors") {
        const type = request.contractorType?.toLowerCase().includes("image") ? "image" : "video";
        console.log(`🟢 Fetching contractor list for type: ${type}`);
        fetchContractorList(type);
    }

    else if (request.action === "openRemoveContractorTab") {
        const listUrl = request.listUrl;
        chrome.storage.local.set({
            contractorNameForRemoval: request.name,
            contractorTypeForRemoval: request.type
        }, () => {
            console.log("📦 Stored contractor data in Chrome storage:", request.name, request.type);
        });

        console.log("📥 Stored for removal:", contractorNameForRemoval, contractorTypeForRemoval);
        console.log("📥 Received openRemoveContractorTab with URL:", listUrl);

        chrome.tabs.create({ url: listUrl }, (tab) => {
            const tabId = tab.id;

            const listener = function (updatedTabId, changeInfo) {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    console.log("✅ Remove list tab fully loaded. Injecting removeListActions.js...");
                    console.log("📦 Injecting name/type into settings tab:", contractorNameForRemoval, contractorTypeForRemoval);

                    chrome.scripting.executeScript({
                        target: { tabId },
                        files: ["removeListActions.js"]
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.error("🚨 Injection error:", chrome.runtime.lastError.message);
                        } else {
                            console.log("✅ removeListActions.js successfully injected.");
                        }
                    });

                    chrome.tabs.onUpdated.removeListener(listener);
                }
            };

            chrome.tabs.onUpdated.addListener(listener);
        });
    }

    else if (request.action === "openUserSettingsTab") {
        console.log("📥 Received request to open user settings tab");

        const url = "https://app.clickup.com/9018441024/settings/team/9018441024/users?via=settings-short-menu";

        chrome.tabs.create({ url }, (tab) => {
            const tabId = tab.id;

            const listener = function (updatedTabId, changeInfo) {
                if (updatedTabId === tabId && changeInfo.status === "complete") {
                    console.log("✅ Settings tab fully loaded. Injecting script...");

                    chrome.storage.local.get(["contractorNameForRemoval", "contractorTypeForRemoval"], (result) => {
                        const name = result.contractorNameForRemoval || "Unknown";
                        const type = result.contractorTypeForRemoval || "Unknown";

                        console.log("📦 Retrieved from storage:", name, type);

                        chrome.scripting.executeScript({
                            target: { tabId },
                            func: (name, type) => {
                                window.contractorNameFromExtension = name;
                                window.contractorTypeFromExtension = type;
                            },
                            args: [name, type]
                        }, () => {
                            console.log("📦 Injected name/type into tab");

                            chrome.scripting.executeScript({
                                target: { tabId },
                                files: ["memberActions.js"]
                            }, () => {
                                console.log("✅ memberActions.js injected");
                            });
                        });
                    });



                    chrome.tabs.onUpdated.removeListener(listener);
                }
            };

            chrome.tabs.onUpdated.addListener(listener);
        });
    }




});

async function fetchContractorList(type) {
    const url = `https://abdelrahman-atm-tash-remove-contractors.hf.space/get-contractors?type=${encodeURIComponent(type)}`;
    console.log("📡 Fetching contractor list from:", url);

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            console.error(`❌ Fetch failed: HTTP ${response.status}`);
            return;
        }

        const contractors = await response.json();
        if (!Array.isArray(contractors) || contractors.length === 0) {
            console.warn("⚠️ No contractors found!");
        }

        chrome.runtime.sendMessage({
            action: "updateContractorDropdown",
            contractors
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("🚨 Error sending message:", chrome.runtime.lastError);
            } else {
                console.log("📤 Contractors sent to popup.js");
            }
        });

    } catch (error) {
        console.error("🚨 Error fetching contractor list:", error);
    }
}

async function createListFromBackend(name, type, callback) {
    const baseUrl = "https://mr-help-tash-create-contractor-list.hf.space";
    const endpoint = type === "image" ? "/image" : "/video";
    const url = `${baseUrl}${endpoint}`;

    console.log("📨 Sending request to backend for list creation:", { listName: name, contractorType: type });

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listName: name })
        });

        const result = await response.json();
        console.log("📩 Backend Response:", result);

        if (result.list_url) {
            callback(result.list_url);
        } else {
            callback(null);
        }
    } catch (err) {
        console.error("❌ Failed to reach backend API:", err);
        callback(null);
    }
}