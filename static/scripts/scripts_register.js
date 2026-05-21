function createAccount(event) {
    event.preventDefault();

    const submitBtn = document.getElementById("submitBtn");

    const fullName =
        document.getElementById("fullName").value.trim();

    const username =
        document.getElementById("username").value.trim();

    const contactNumber =
        document.getElementById("contactNumber").value.trim();

    const password =
        document.getElementById("password").value;

    const role =
        document.getElementById("role").value;

    if (!fullName || !username || !contactNumber || !password || !role) {
        alert("Please complete all fields.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "CREATING...";

    fetch('/create_user_account', {

        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            fullName,
            username,
            password,
            contactNumber,
            role   // ✅ IMPORTANT
        })
    })

    .then(res => res.json())

    .then(data => {

        submitBtn.disabled = false;
        submitBtn.innerText = "CREATE ACCOUNT";

        if (!data.success) {
            alert(data.message || "Failed to create account.");
            return;
        }

        alert("Account created successfully!");

        window.location.href = "/user_login";
    })

    .catch(err => {

        submitBtn.disabled = false;
        submitBtn.innerText = "CREATE ACCOUNT";

        console.error(err);
        alert("Something went wrong.");
    });
}