document.addEventListener("DOMContentLoaded", function () {
    bootstrapPage("");
    document.getElementById("loginForm").addEventListener("submit", handleLogin);

    const existingUser = getCurrentUser();
    if (existingUser) {
        window.location.href = getRootPath() + getDashboardPath(existingUser.role);
    }
});

// -- Login

async function handleLogin(event) {
    event.preventDefault();

    const message = document.getElementById("loginMessage");
    message.className = "alert hidden";
    message.textContent = "";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email) {
        showLoginError(message, "Email is required.");
        return;
    }

    if (!isValidEmail(email)) {
        showLoginError(message, "Please enter a valid email address.");
        return;
    }

    if (!password) {
        showLoginError(message, "Password is required.");
        return;
    }

    const body = {
        email: email,
        password: password
    };

    const result = await apiPost("/Auth/login", body);

    if (!result.ok) {
        if (result.data && result.data.errors) {
            showLoginError(message, getFirstValidationError(result.data.errors));
            return;
        }

        if (result.data && result.data.message) {
            showLoginError(message, result.data.message);
            return;
        }

        showLoginError(message, "Invalid email or password.");
        return;
    }

    setCurrentUser(result.data.user);
    window.location.href = getRootPath() + getDashboardPath(result.data.user.role);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showLoginError(messageElement, text) {
    messageElement.className = "alert bad";
    messageElement.textContent = text;
}

function getFirstValidationError(errors) {
    for (const field in errors) {
        if (errors[field] && errors[field].length > 0) {
            return errors[field][0];
        }
    }
    return "Validation failed.";
}