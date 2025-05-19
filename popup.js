document.addEventListener("DOMContentLoaded", function () {
    let hasFetchedContractors = false; // Prevent multiple API calls

    // Tab Switching
    document.querySelectorAll(".tab-button").forEach(button => {
        button.addEventListener("click", function () {
            document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));

            this.classList.add("active");
            document.getElementById(this.dataset.tab).classList.add("active");

            console.log(`🔹 Switched to tab: ${this.dataset.tab}`);

            // Fetch contractors only when switching to "Remove Contractors" tab
            if (this.dataset.tab === "removeContractor") {
                const typeDropdown = document.getElementById("removeContractorType");
                const contractorList = document.getElementById("contractorList");

                // Reset previous dropdown
                contractorList.innerHTML = `<option value="">Choose Contractor</option>`;
                hasFetchedContractors = false;

                // Attach change listener if not already attached
                if (!typeDropdown.dataset.listenerAttached) {
                    typeDropdown.addEventListener("change", function () {
                        const selectedType = this.value;
                        if (selectedType) {
                            console.log(`📡 Fetching contractors for: ${selectedType}`);
                            chrome.runtime.sendMessage({
                                action: "fetchContractors",
                                contractorType: selectedType
                            });
                            hasFetchedContractors = true;
                        }
                    });
                    typeDropdown.dataset.listenerAttached = "true";
                }
            }
        });
    });

    // Open ClickUp page with contractor name
    // Add contractor with native form validation
    document.getElementById("addContractorForm").addEventListener("submit", function (e) {
        e.preventDefault(); // Prevent page reload

        const name = document.getElementById("contractorName").value.trim();
        const email = document.getElementById("contractorEmail").value.trim();
        const type = document.getElementById("contractorType").value;

        // All fields are already validated by browser
        chrome.runtime.sendMessage({
            action: "openClickUpPage",
            name: name,
            email: email,
            type: type
        });
    });

    // Remove selected contractor
    document.getElementById("removeContractorBtn").addEventListener("click", () => {
        const type = document.getElementById("removeContractorType").value.toLowerCase();
        const name = document.getElementById("contractorList").value;

        if (!name || !type) {
            showPopupMessage("⚠️ Please select both contractor type and name.", "warning");
            return;
        }

        console.log(`📤 Requesting list for "${name}" (${type})...`);

        fetch("https://abdelrahman-atm-tash-remove-contractors.hf.space/get-list-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, type })
        })
        .then(res => res.json())
        .then(data => {
            if (data.list_url) {
                console.log("🔗 Sending list URL to background.js:", data.list_url);
                chrome.runtime.sendMessage({
                    action: "openRemoveContractorTab",
                    listUrl: data.list_url,
                    name,
                    type
                });


            } else {
                showPopupMessage("❌ Could not find the list. Please double-check the contractor name.", "error");
                console.error("❌ Server response:", data);
            }
        })
        .catch(err => {
            showPopupMessage("🚨 Failed to fetch the list URL.", "error");
            console.error("🚨 Error:", err);
        });
    });


    // Listen for contractor list update from background.js
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "updateContractorDropdown") {
            console.log("🎯 Updating dropdown with received contractor list:", message.contractors);

            const dropdown = document.getElementById("contractorList");
            dropdown.innerHTML = ""; // Clear previous options

            if (message.contractors.length === 0) {
                dropdown.innerHTML = `<option value="">No contractors available</option>`;
                return;
            }

            message.contractors.forEach(name => {
                const optionElement = document.createElement("option");
                optionElement.value = name; // Ensure the option has a value
                optionElement.textContent = name;
                dropdown.appendChild(optionElement);
            });

            console.log("✅ Dropdown successfully updated!");
        }
    });
});

function showPopupMessage(message, type = "warning") {
    const popup = document.createElement("div");
    popup.textContent = message;

    const colors = {
        success: "#4CAF50",
        warning: "#ff9800",
        error: "#f44336"
    };

    popup.style.position = "fixed";
    popup.style.bottom = "20px";
    popup.style.right = "20px";
    popup.style.padding = "12px 20px";
    popup.style.backgroundColor = colors[type] || "#333";
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
