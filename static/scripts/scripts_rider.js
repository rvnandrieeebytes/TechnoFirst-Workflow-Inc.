let isLoading = false;
let lastDataHash = "";

/* =========================
   LOAD DELIVERIES
========================= */
function loadDeliveries() {

    if (isLoading) return;
    isLoading = true;

    fetch('/api/get_deliveries?t=' + Date.now(), {
        cache: "no-store"
    })
        .then(res => {

            if (res.status === 403) {
                throw new Error("Unauthorized (403). Please re-login as rider.");
            }

            return res.json();
        })
        .then(data => {

            const tableBody = document.getElementById("deliveryTableBody");
            if (!tableBody) return;

            const newHash = JSON.stringify(data);
            if (newHash === lastDataHash) {
                isLoading = false;
                return;
            }
            lastDataHash = newHash;

            tableBody.innerHTML = "";

            if (!data || data.length === 0) {

                tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:20px;">
                        No deliveries assigned.
                    </td>
                </tr>
            `;

                isLoading = false;
                return;
            }

            data.forEach(order => {

                const row = document.createElement("tr");

                row.innerHTML = `
                <td>${order.assignedID || ""}</td>

                <td>
                    ${order.firstName || ""} 
                    ${order.middleName || ""} 
                    ${order.lastName || ""}<br>
                    ${order.contactNumber}
                </td>

                <td>${order.address || ""}</td>

                <td>${order.deadline || "No deadline"}</td>

                <td>₱${order.price || 0}</td>

                <td>
                    <button class="deliver-btn"
                        onclick="markDelivered('${order.assignedID}')">
                        MARK DELIVERED
                    </button>
                </td>
            `;

                tableBody.appendChild(row);
            });

            isLoading = false;
        })
        .catch(err => {

            console.error("Load Deliveries Error:", err);
            isLoading = false;
        });
}

/* =========================
   MARK DELIVERED
========================= */
function markDelivered(assignedID) {

    if (!assignedID) return;

    fetch('/mark_delivered', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            assignedID: assignedID
        })
    })
        .then(res => res.json())
        .then(data => {

            if (!data.success) {
                alert("Failed to mark delivered.");
                return;
            }

            loadDeliveries();
        })
        .catch(err => {
            console.error("Delivered Error:", err);
        });
}

/* =========================
   AUTO REFRESH
========================= */
setInterval(() => {

    const active = document.activeElement;

    if (!active?.classList?.contains("deliver-btn")) {
        loadDeliveries();
    }

}, 3000);

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
    loadDeliveries();
});