function markDone(fileName, btn) {
    // 1. Tell the server the job is done (notifies the user)
    fetch('/mark_done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: fileName })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // 2. Visual feedback: Change button status
                btn.innerText = "NOTIFIED";
                btn.disabled = true;
                btn.style.opacity = "0.5";

                // 3. Wait 3 seconds (so you can see it's done) then delete the row
                setTimeout(() => {
                    const row = btn.closest('tr');
                    row.style.transition = "opacity 0.5s ease";
                    row.style.opacity = "0";

                    setTimeout(() => {
                        row.remove(); // Remove from HTML

                        // 4. Optional: Permanently delete from Python memory
                        fetch('/remove_from_admin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fileName: fileName })
                        });
                    }, 500);
                }, 3000);
            }
        });
}

function updateDashboard() {
    fetch('/api/get_queue')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('queueTableBody');
            tableBody.innerHTML = ''; 

            data.forEach(order => {
                // Ensure these keys (order.paperType, etc.) match your app.py dictionary
                let row = `
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 10px;">${order.assignedID}</td>
                        <td>${order.fileName}</td>
                        <td>${order.paperType}</td>
                        <td>${order.size}</td>
                        <td>${order.colorMode === 'colored' ? 'Colored' : 'B&W'}</td>
                        <td>${order.isThesis}</td>
                        <td>${order.shouldBind}</td>
                        <td>
                            ${order.isHurry === 'yes' 
                                ? `<span style="color: #ff4444;">PRIORITY: ${order.priority}</span><br><small>By: ${order.deadline}</small>` 
                                : 'Normal'}
                        </td>
                        <td>
                            <button onclick="markDone('${order.fileName}', this)"
                                style="background: #4CAF50; color: white; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px;">
                                MARK AS DONE
                            </button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        });
}

// Check for new orders every 5 seconds
setInterval(updateDashboard, 1000);

// Initial load
updateDashboard();