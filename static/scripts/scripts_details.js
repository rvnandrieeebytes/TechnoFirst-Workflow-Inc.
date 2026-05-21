document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       1. FILE NAME FROM URL
    ========================== */
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('fileId');
    const fileName = urlParams.get('file');

    const displayFileName = document.getElementById("displayFileName");

    if (fileName && displayFileName) {
        displayFileName.textContent = decodeURIComponent(fileName);
    } else if (displayFileName) {
        displayFileName.textContent = "Error: No file selected";
        displayFileName.style.color = "#ff4444";
    }


    /* =========================
       2. FILE TYPE SECTIONS
    ========================== */
    const fileType = document.getElementById("fileType");

    const photoSection = document.getElementById("photoSection");
    const docSection = document.getElementById("docSection");
    const collectionSection = document.getElementById("collectionSection");

    function resetSections() {
        photoSection.classList.add("hidden");
        docSection.classList.add("hidden");
        collectionSection.classList.add("hidden");
    }

    window.handleFileType = function () {
        resetSections();

        switch (fileType.value) {
            case "photo":
                photoSection.classList.remove("hidden");
                break;
            case "document":
                docSection.classList.remove("hidden");
                break;
            case "collection":
                collectionSection.classList.remove("hidden");
                break;
        }
    };


    /* =========================
       3. PAPER TYPE LOGIC
    ========================== */
    const paperType = document.getElementById('paperType');
    const docSize = document.getElementById('docSize');

    if (paperType && docSize) {
        paperType.addEventListener('change', function () {

            const type = this.value;

            if (type === "card" || type === "vellum") {
                docSize.innerHTML = `
                    <option value="letter">Letter (8.5 x 11)</option>
                    <option value="a4">A4 (8.3 x 11.7)</option>
                `;
            } else {
                docSize.innerHTML = `
                    <option value="letter">Letter (8.5 x 11)</option>
                    <option value="legal">Legal (8.5 x 14)</option>
                    <option value="a4">A4 (8.3 x 11.7)</option>
                `;
            }
        });
    }


    /* =========================
       4. HURRY / DEADLINE
    ========================== */
    const hurryRadios = document.getElementsByName('isHurry');
    const deadlineSection = document.getElementById('deadlineSection');

    if (deadlineSection) deadlineSection.classList.add("hidden");

    hurryRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === "yes") {
                deadlineSection.classList.remove("hidden");
            } else {
                deadlineSection.classList.add("hidden");
                const dl = document.getElementById('deadlineTime');
                if (dl) dl.value = "";
            }
        });
    });


    /* =========================
       5. DELIVERY LOGIC
    ========================== */
    const deliveryType = document.getElementById("deliveryType");
    const deliveryFields = document.getElementById("deliveryFields");

    const firstName = document.getElementById("firstName");
    const lastName = document.getElementById("lastName");
    const address = document.getElementById("address");
    const contactNumber = document.getElementById("contactNumber");

    function handleDelivery() {

        if (!deliveryType) return;

        if (deliveryType.value === "delivery") {
            deliveryFields.classList.remove("hidden");

            firstName.required = true;
            lastName.required = true;
            address.required = true;
            contactNumber.required = true;
        } else {
            deliveryFields.classList.add("hidden");

            firstName.required = false;
            lastName.required = false;
            address.required = false;
            contactNumber.required = false;
        }
    }

    if (deliveryType) {
        deliveryType.addEventListener("change", handleDelivery);
        handleDelivery();
    }


    /* =========================
       6. SUBMIT TO QUEUE (FIXED)
    ========================== */
    const detailsForm = document.getElementById('detailsForm');

    detailsForm.addEventListener('submit', (event) => {

        event.preventDefault();

        const isHurry = document.querySelector('input[name="isHurry"]:checked')?.value;
        const deadlineValue = document.getElementById('deadlineTime')?.value;

        if (!fileType.value) {
            alert("Please select file type first!");
            return;
        }

        if (isHurry === "yes" && !deadlineValue) {
            alert("Please set deadline for urgent order!");
            return;
        }

        let size = "";

        if (fileType.value === "document") {
            size = document.getElementById('docSize')?.value || "";
        } else if (fileType.value === "photo") {
            size = document.getElementById('photoSize')?.value || "";
        } else if (fileType.value === "collection") {
            size = document.getElementById('collectionSize')?.value || "";
        }

        const printData = {
            fileId: fileId,
            fileName: fileName,
            fileType: fileType.value,

            paperType: document.getElementById('paperType')?.value || "",
            size: size,

            colorMode: document.querySelector('input[name="colorMode"]:checked')?.value || "bw",
            isThesis: document.querySelector('input[name="isThesis"]:checked')?.value || "No",
            shouldBind: document.querySelector('input[name="binding"]:checked')?.value || "No",
            laminate: document.querySelector('input[name="laminate"]:checked')?.value || "No",
            cutPhotos: document.querySelector('input[name="cutPhotos"]:checked')?.value || "No",

            isHurry: isHurry,
            deadline: deadlineValue,

            deliveryType: deliveryType?.value || "pickup",

            firstName: firstName?.value || "",
            middleName: document.getElementById("middleName")?.value || "",
            lastName: lastName?.value || "",
            address: address?.value || "",
            contactNumber: contactNumber?.value || "",

            moreInfo: document.getElementById("moreInfo")?.value || ""
        };


        fetch('/add_to_queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(printData)
        })
        .then(res => res.json())
        .then(data => {

            console.log("QUEUE RESPONSE:", data);

            // ✅ FIXED HERE (was data.status before)
            if (data.success) {

                window.location.href =
                    `/waiting?file=${encodeURIComponent(fileName)}&assignedID=${data.assignedID || ""}`;

            } else {
                alert("Server error: " + (data.error || "Unknown error"));
            }

        })
        .catch(err => {
            console.error("Critical Error:", err);
            alert("Network error. Please try again.");
        });

    });

});