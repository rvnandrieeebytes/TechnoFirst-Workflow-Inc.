function loginUser(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch('/auth_login', {

        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            username,
            password
        })
    })

    .then(res => res.json())
    .then(data => {

        if (!data.success) {
            alert("Invalid credentials.");
            return;
        }

        // ROLE-BASED REDIRECT (THIS IS THE KEY FIX)
        if (data.role === "admin") {
            window.location.href = "/admin_dashboard";
        }
        else if (data.role === "rider") {
            window.location.href = "/rider";
        }
        else {
            alert("Unknown role.");
        }
    })

    .catch(err => {
        console.error(err);
    });
}