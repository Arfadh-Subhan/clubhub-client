let currentUser = null;
let selectedPhotoBytes = null;

document.addEventListener("DOMContentLoaded", function () {
    currentUser = requireLogin();
    if (!currentUser) return;

    bootstrapPage("");
    loadProfile();

    document.getElementById("profilePhotoInput").addEventListener("change", handlePhotoSelect);
    document.getElementById("profileForm").addEventListener("submit", handleSave);
});

// -- Load profile

async function loadProfile() {
    try {
        const user = await apiGet("/Profile/" + currentUser.userId);
        if (!user) return;

        document.getElementById("pfFullName").value = user.fullName || "";
        document.getElementById("pfPhone").value = user.phoneNumber || "";
        document.getElementById("pfSemester").value = user.semester || "";
        document.getElementById("pfStudentId").value = user.studentId || "—";
        document.getElementById("pfRole").value = getRoleLabel(user.role);
        document.getElementById("pfEmail").value = user.email || "";

        const initial = user.fullName ? user.fullName.charAt(0).toUpperCase() : "U";
        const photoUri = decodeImage(user.profilePhoto);

        if (photoUri) {
            const preview = document.getElementById("profilePhotoPreview");
            preview.src = photoUri;
            preview.style.display = "block";
            document.getElementById("profilePhotoPlaceholder").style.display = "none";
        } else {
            document.getElementById("profilePhotoPlaceholder").textContent = initial;
        }
    } catch (error) {
        console.error(error);
        showToast("Could not load profile", "error");
    }
}

// -- Photo select

function handlePhotoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64 = e.target.result.split(",")[1];
        selectedPhotoBytes = base64;

        const preview = document.getElementById("profilePhotoPreview");
        preview.src = e.target.result;
        preview.style.display = "block";

        document.getElementById("profilePhotoPlaceholder").style.display = "none";
    };
    reader.readAsDataURL(file);
}

// -- Save

async function handleSave(event) {
    event.preventDefault();

    const message = document.getElementById("profileMessage");
    message.className = "alert hidden";
    message.textContent = "";

    const body = {
        fullName: document.getElementById("pfFullName").value.trim(),
        phoneNumber: document.getElementById("pfPhone").value.trim(),
        semester: document.getElementById("pfSemester").value.trim(),
        profilePhoto: selectedPhotoBytes || null
    };

    if (!body.fullName || !body.phoneNumber || !body.semester) {
        message.className = "alert bad";
        message.textContent = "Please fill in all required fields.";
        return;
    }

    const result = await apiPut("/Profile/" + currentUser.userId, body);

    if (!result.ok) {
        message.className = "alert bad";
        message.textContent = (result.data && result.data.message) ? result.data.message : "Could not save changes.";
        return;
    }

    message.className = "alert good";
    message.textContent = "Profile updated.";

    if (result.data && result.data.user) {
        const updated = result.data.user;
        const session = getCurrentUser();
        if (session) {
            session.fullName = updated.fullName;
            session.phoneNumber = updated.phoneNumber;
            session.semester = updated.semester;
            session.profilePhoto = updated.profilePhoto;
            setCurrentUser(session);

            const preview = document.getElementById("profilePhotoPreview");
            if (updated.profilePhoto) {
                preview.src = decodeImage(updated.profilePhoto);
                preview.style.display = "block";
                document.getElementById("profilePhotoPlaceholder").style.display = "none";
            }
        }
        renderTopnav();
    }

    selectedPhotoBytes = null;
}