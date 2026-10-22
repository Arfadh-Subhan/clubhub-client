document.addEventListener("DOMContentLoaded", function () {
    bootstrapPage("");
    document.getElementById("registerForm").addEventListener("submit", handleRegister);
});

async function handleRegister(event) {
    event.preventDefault();

    const message = document.getElementById("registerMessage");
    message.className = "alert hidden";
    message.textContent = "";

    const studentId = document.getElementById("regStudentId").value.trim();
    const fullName = document.getElementById("regFullName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const phoneNumber = document.getElementById("regPhone").value.trim();
    const semester = document.getElementById("regSemester").value.trim();
    const accepted = document.getElementById("regAcceptTerms").checked;

    if (!studentId) {
        showModalError(message, "Student ID is required.");
        return;
    }

    if (!fullName) {
        showModalError(message, "Full name is required.");
        return;
    }

    if (!isValidName(fullName)) {
        showModalError(message, "Full name can only contain letters and spaces.");
        return;
    }

    if (!email) {
        showModalError(message, "Email is required.");
        return;
    }

    if (!isValidEmail(email)) {
        showModalError(message, "Please enter a valid email address.");
        return;
    }

    if (!isGmailAddress(email)) {
        showModalError(message, "Email must end with @gmail.com");
        return;
    }

    if (!password) {
        showModalError(message, "Password is required.");
        return;
    }

    if (password.length < 8) {
        showModalError(message, "Password must be at least 8 characters long.");
        return;
    }

    if (!isStrongPassword(password)) {
        showModalError(message, "Password must contain at least one letter and one number.");
        return;
    }

    if (!phoneNumber) {
        showModalError(message, "Phone number is required.");
        return;
    }

    if (!isValidSriLankanPhone(phoneNumber)) {
        showModalError(message, "Phone number must be in the format +947XXXXXXXX");
        return;
    }

    if (!semester) {
        showModalError(message, "Semester is required.");
        return;
    }

    if (!accepted) {
        showModalError(message, "Please read and accept the Terms & Conditions before creating an account.");
        return;
    }

    const body = {
        studentId: studentId,
        fullName: fullName,
        email: email,
        password: password,
        phoneNumber: phoneNumber,
        semester: semester
    };

    const result = await apiPost("/Auth/register", body);

    if (!result.ok) {
        if (result.data && result.data.errors) {
            showModalError(message, getFirstValidationError(result.data.errors));
            return;
        }

        if (result.data && result.data.message) {
            showModalError(message, result.data.message);
            return;
        }

        showModalError(message, "Registration failed.");
        return;
    }

    message.className = "alert good";
    message.textContent = "Account created — you can now log in.";

    document.getElementById("registerForm").reset();

    setTimeout(function () {
        window.location.href = "login.html";
    }, 1200);
}