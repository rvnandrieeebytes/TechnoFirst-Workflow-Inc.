document.addEventListener("DOMContentLoaded", () => {
    const dropArea = document.getElementById("dropArea");
    const fileInput = document.getElementById("fileInput");
    const progressBar = document.getElementById("progressBar");
    const uploadStatus = document.getElementById("uploadStatus");
    const statusText = document.getElementById("statusText");

    // --- 1. VERIFICATION CHECK ---
    if (!dropArea || !fileInput) {
        console.error("HTML Elements missing! Check your IDs.");
        return;
    }

    // --- 2. CLICK HANDLER ---
    dropArea.addEventListener("click", () => fileInput.click());

    // --- 3. SELECTION HANDLER ---
    fileInput.addEventListener("change", function() {
        if (this.files.length > 0) {
            uploadFile(this.files[0]);
        }
    });

    // --- 4. DRAG & DROP HANDLERS ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
        dropArea.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    dropArea.addEventListener("dragover", () => dropArea.classList.add("dragover"));
    dropArea.addEventListener("dragleave", () => dropArea.classList.remove("dragover"));

    dropArea.addEventListener("drop", (e) => {
        dropArea.classList.remove("dragover");
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    });

    // --- 5. THE UPLOAD LOGIC ---
    function uploadFile(file) {
        console.log("Starting upload for:", file.name);

        // --- NEW: FILE TYPE VERIFICATION ---
        const ext = file.name.split('.').pop().toLowerCase();
        
        // Define exactly what files your print shop accepts
        const allowedExtensions = [
            'jpg', 'jpeg', 'png', // Images
            'pdf', 'docx', 'doc' // Documents
        ];

        if (!allowedExtensions.includes(ext)) {
            alert(`Error: .${ext} files are not supported. Please upload an image or document.`);
            // Reset the file input so they can try again
            fileInput.value = ""; 
            return; // Stop the upload process immediately
        }
        // ------------------------------------
        
        const formData = new FormData();
        // IMPORTANT: The key 'file' must match request.files['file'] in app.py
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        // Show progress bar
        if (uploadStatus) uploadStatus.style.display = "block";

        // Monitor Progress
        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                if (progressBar) progressBar.style.width = percent + "%";
                if (statusText) statusText.textContent = `Uploading: ${Math.round(percent)}%`;
            }
        });

        // Response from Python
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) { // 4 means request is finished
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    console.log("Server Response:", response);
                    // Redirect to details page
                    window.location.href =`/details?file=${encodeURIComponent(response.fileName)}`;
                } else {
                    console.error("Upload failed with status:", xhr.status);
                    alert("Upload failed. Check terminal for Python errors.");
                }
            }
        };

        xhr.open("POST", "/upload", true);
        xhr.send(formData);
    }
});