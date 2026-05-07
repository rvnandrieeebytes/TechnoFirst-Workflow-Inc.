document.addEventListener("DOMContentLoaded", () => {
    // 1. URL Extraction
    const urlParams = new URLSearchParams(window.location.search);
    const fileName = urlParams.get('file');

    // 2. Display the Filename (MATCHES YOUR ID: displayFileName)
    const displayFileName = document.getElementById("displayFileName");
    if (fileName && displayFileName) {
        displayFileName.textContent = decodeURIComponent(fileName);
    } else if (displayFileName) {
        displayFileName.textContent = "Error: No file selected";
        displayFileName.style.color = "#ff4444";
    }

    // --- DYNAMIC SIZE SELECTION ---
    const paperTypeSelect = document.getElementById('paperType'); // Ensure this ID matches your HTML
    const sizeSelect = document.getElementById('sizeSelect');

    paperTypeSelect.addEventListener('change', function () {
        const isLaminated = this.value === 'Laminated';
        sizeSelect.innerHTML = "";

        if (isLaminated) {
                sizeSelect.innerHTML = `
                    <option value="ID">ID Size</option>
                    <option value="3R">3R</option>
                    <option value="4R">4R</option>
                    <option value="5R">5R</option>
                    <option value="A4">A4</option>
                `;
            } else {
                sizeSelect.innerHTML = `
                    <option value="Letter">Letter (Short)</option>
                    <option value="A4">A4</option>
                    <option value="Legal">Legal (Long)</option>
                `;
            }
    });

    // 3. Hurry/Priority Toggle Logic
    const hurryRadios = document.getElementsByName('isHurry');
    const prioritySection = document.getElementById('prioritySection');

    // Initial state check
    prioritySection.style.display = 'none';

    hurryRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            prioritySection.style.display = (e.target.value === 'yes') ? 'block' : 'none';
        });
    });

    // --- PRIORITY SLIDER UPDATE ---
    const priorityRange = document.getElementById('priorityRange');
    const priorityValue = document.getElementById('priorityValue');

    if (priorityRange && priorityValue) {
        priorityRange.addEventListener('input', function () {
            // This line updates the 5 to whatever the slider position is
            priorityValue.textContent = this.value;

            // Optional: Change color based on intensity
            if (this.value <= 3) {
                priorityValue.style.color = "#ff4444"; // Red for high priority
            } else {
                priorityValue.style.color = "white";
            }
        });
    }

    // 4. Laminated Logic (Hiding Thesis/Binding options)
    const paperType = document.getElementById('paperType');
    const docOptions = document.querySelectorAll('.doc-option');

    paperType.addEventListener('change', function () {
        const isLaminated = this.value === 'Laminated';
        docOptions.forEach(el => el.style.display = isLaminated ? 'none' : '');
    });

    // 5. Submit Button Logic (MATCHES YOUR ID: submitBtn)
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.addEventListener('click', () => {
        const isHurry = document.querySelector('input[name="isHurry"]:checked').value;
        const deadlineInput = document.getElementById('deadlineTime');
        const deadlineValue = deadlineInput.value;

        // --- NEW: VALIDATION CHECK ---
        if (isHurry === 'yes' && !deadlineValue) {
            alert("Please set a deadline time for priority orders!");
            deadlineInput.focus();
            deadlineInput.style.border = "2px solid #ff4444"; // Highlight the error
            return; // STOP the fetch process
        }

        // Collect all data points based on your HTML structure
        const printData = {
            fileName: fileName,
            paperType: document.getElementById('paperType').value,
            size: document.getElementById('sizeSelect').value,
            colorMode: document.querySelector('input[name="colorMode"]:checked').value,
            isThesis: document.querySelector('input[name="isThesis"]:checked').value,
            shouldBind: document.querySelector('input[name="shouldBind"]:checked').value,
            isHurry: document.querySelector('input[name="isHurry"]:checked').value,
            priority: document.getElementById('priorityRange').value,
            deadline: document.getElementById('deadlineTime').value
        };

        fetch('/add_to_queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(printData)
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    window.location.href = `/waiting?file=${encodeURIComponent(fileName)}`;
                } else {
                    alert("Server error: " + (data.error || "Unknown error"));
                }
            })
            .catch(err => console.error("Critical Failure:", err));
    });
});