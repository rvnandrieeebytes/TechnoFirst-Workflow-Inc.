const urlParams = new URLSearchParams(window.location.search);
const fileName = urlParams.get('file');

const poll = setInterval(() => {
    fetch(`/check_status?file=${encodeURIComponent(fileName)}`)
        .then(res => res.json())
        .then(data => {
            if (data.assignedID) {
                document.getElementById('assignedID').innerText = data.assignedID;
            }
            if (data.isDone) {
                document.getElementById('waitMsg').style.display = 'none';
                document.getElementById('doneMsg').style.display = 'flex';
                document.getElementById('statusIndicator').classList.add('done');
                clearInterval(poll);
            }
        });
}, 2000);