function markDone(fileName, btn) {
    // 1. Tell the server the job is done (notifies the user)
    fetch('/mark_done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: fileName })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
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