document.addEventListener("DOMContentLoaded", () => {

    const urlParams = new URLSearchParams(window.location.search);
    const orderID = urlParams.get('assignedID');

    if (!orderID) {
        alert("No order detected.");
        window.location.href = "/";
        return;
    }

    const statusText = document.getElementById("statusText");
    const statusIndicator = document.getElementById("statusIndicator");

    const priceContainer = document.getElementById("priceContainer");
    const priceDisplay = document.getElementById("priceDisplay");

    const riderInfo = document.getElementById("riderInfo");
    const riderName = document.getElementById("riderName");
    const riderContact = document.getElementById("riderContact");

    const assignedIDLabel = document.getElementById("assignedID");
    const orderAgainBtn = document.getElementById("orderAgainBtn");

    setInterval(() => {

        fetch(`/check_status?assignedID=${orderID}`, { cache: "no-store" })
            .then(res => res.json())
            .then(data => {

                if (data.assignedID) {
                    assignedIDLabel.innerText = data.assignedID;
                }

                priceContainer.style.display = "none";
                riderInfo.style.display = "none";
                orderAgainBtn.style.display = "none";
                statusIndicator.classList.remove("done");

                switch (data.status) {

                    case "pending":
                        statusText.innerText = "Waiting in queue...";
                        break;

                    case "printing":
                        statusText.innerText = "Printing your documents...";
                        break;

                    case "ready":
                        statusText.innerText = "READY FOR PICKUP\n\nSAVE OR SCREENSHOT\nYOUR QUEUING NUMBER";
                        priceContainer.style.display = "block";
                        orderAgainBtn.style.display = "inline-block";
                        priceDisplay.innerText = `₱${data.price || 0}`;
                        statusIndicator.classList.add("done");
                        break;

                    case "out_for_delivery":
                        statusText.innerText = "OUT FOR DELIVERY\n\nSAVE OR SCREENSHOT\nYOUR QUEUING NUMBER";

                        priceContainer.style.display = "block";
                        riderInfo.style.display = "block";

                        priceDisplay.innerText = `₱${data.price || 0}`;

                        riderName.innerText = data.riderName || "Unknown Rider";
                        riderContact.innerText = data.riderContact || "No Contact";

                        statusIndicator.classList.add("done");
                        break;

                    case "delivered":
                        statusText.innerText = "DELIVERED";

                        priceContainer.style.display = "block";
                        orderAgainBtn.style.display = "inline-block";
                        priceDisplay.innerText = `₱${data.price || 0}`;

                        statusIndicator.classList.add("done");
                        break;

                    default:
                        statusText.innerText = "Processing...";
                }

            });

    }, 2000);
});