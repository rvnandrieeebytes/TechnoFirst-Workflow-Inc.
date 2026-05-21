let tempPrices = {};
let selectedRiders = {};
let riders = [];

function loadRiders() {
    fetch('/api/get_riders?t=' + Date.now(), {
        credentials: "include"
    })
        .then(res => res.json())
        .then(data => {
            riders = data;
        })
        .catch(err => {
            console.error("Load Riders Error:", err);
        });
}

function updateStatus(assignedID, status, price = 0) {

    fetch('/update_status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            assignedID: assignedID,
            status: status,
            price: price
        })
    })

        .then(res => res.json())
        .then(data => {

            if (!data.success) {
                alert("Failed to update status.");
                return;
            }

            updateDashboard();
        })

        .catch(err => {
            console.error("Update Status Error:", err);
        });
}

function updateDashboard() {

    fetch('/api/get_queue?t=' + Date.now(), {
        cache: 'no-store'
    })
        .then(res => res.json())
        .then(data => {

            const tableBody = document.getElementById('queueTableBody');
            tableBody.innerHTML = '';

            data.forEach(order => {

                const row = document.createElement('tr');
                row.style.borderBottom = "1px solid #333";

                row.innerHTML = `
                    <td style="padding: 10px;">${order.assignedID || ""}</td>
                    <td>${order.fileName || ""}</td>
                    <td>${order.paperType || ""}</td>
                    <td>${order.size || ""}</td>

                    <td>${order.colorMode === 'colored' ? 'Colored' : 'B&W'}</td>

                    <td>${order.isThesis || "No"}</td>
                    <td>${order.shouldBind || "No"}</td>

                    <td>
                        Laminate: ${order.laminate || "No"}<br>
                        Cut Photos: ${order.cutPhotos || "No"}<br><br>
                        More Info:<br>${order.moreInfo || "None"}
                    </td>

                    <td>
                        ${order.isHurry === 'yes'
                        ? `<span style="color:#ff4444;">URGENT</span><br>
                           <small>Deadline: ${order.deadline || ""}</small>`
                        : 'Normal'}
                    </td>

                    <td>
                        ${order.deliveryType === 'delivery'
                        ? `<span style="color:#4CAF50;">Delivery</span><br>
                           <small>
                               ${order.firstName || ""} ${order.middleName || ""} ${order.lastName || ""}<br>
                               ${order.address || ""}
                           </small>`
                        : 'Pickup'}
                    </td>

                    <td>
                        <input
                            type="number"
                            class="price-input"
                            placeholder="₱"
                            min="0"
                            value="${tempPrices[order.assignedID] ?? order.price ?? ''}"
                    </td>

                    <td>
                        ${order.status === 'pending'
                        ? `<button class="done-btn">START PRINTING</button>`

                        : order.status === 'printing'
                            ? (
                                order.deliveryType === 'delivery'
                                    ? `
                                <select class="rider-select">
                                    <option value="">Select Rider</option>
                                    ${riders.map(r =>
                                        `<option value="${r.username}">
                                            ${r.fullName}
                                        </option>`
                                    ).join('')}
                                </select>
                                <br><br>
                                <button class="done-btn">ASSIGN RIDER</button>
                            `
                                    : `<button class="done-btn">MARK READY</button>`
                            )

                            : `<span style="color:#4CAF50;font-weight:bold;">
                                ${order.status.replaceAll('_', ' ').toUpperCase()}
                           </span>`
                    }
                    </td>
                `;

                const priceInput = row.querySelector(".price-input");

                if (priceInput) {
                    priceInput.addEventListener("input", () => {
                        tempPrices[order.assignedID] = priceInput.value;
                    });
                }

                const btn = row.querySelector(".done-btn");

                if (btn) {

                    btn.addEventListener("click", () => {

                        let nextStatus = '';

                        if (order.status === 'pending') {
                            nextStatus = 'printing';
                        }

                        else if (order.status === 'printing') {

                            if (order.deliveryType === 'delivery') {

                                const riderSelect = row.querySelector(".rider-select");
                                const riderUsername = riderSelect.value;

                                if (!riderUsername) {
                                    alert("Please select a rider.");
                                    return;
                                }

                                fetch('/assign_rider', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },

                                    body: JSON.stringify({
                                        assignedID: order.assignedID,
                                        riderUsername: riderUsername
                                    })
                                })

                                    .then(res => res.json())
                                    .then(data => {

                                        if (!data.success) {
                                            alert("Failed to assign rider.");
                                            return;
                                        }

                                        updateDashboard();
                                    });

                                return;
                            }

                            nextStatus = 'ready';
                        }

                        const price = parseFloat(
                            tempPrices[order.assignedID]
                            || priceInput.value
                            || 0
                        );

                        updateStatus(order.assignedID, nextStatus, price);
                    });
                }

                tableBody.appendChild(row);
            });

        })
        .catch(err => console.error("Dashboard Error:", err));
}

/* AUTO REFRESH */
setInterval(() => {

    const active = document.activeElement;

    const isTypingPrice =
        active?.classList.contains("price-input");

    const isSelectingRider =
        active?.classList.contains("rider-select");

    if (!isTypingPrice && !isSelectingRider) {
        updateDashboard();
    }

}, 3000);

/* INIT */
loadRiders();
updateDashboard();