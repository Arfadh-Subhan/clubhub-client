let currentUser = null;
let activityLogs = [];
let usersPage = null;
let allUsers = [];
let siteReports = [];
let accountsSearchValue = "";
let accountsRoleFilter = "all";

document.addEventListener("DOMContentLoaded", async function () {
    currentUser = requireLogin();
    if (!currentUser) return;

    bootstrapPage(getActiveTabKey());
    loadPulseForUser(currentUser);
    await loadEverything();
    switchTabFromUrl();
});

function getActiveTabKey() {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "activity-log";
}

function switchTabFromUrl() {
    showTab(getActiveTabKey());
}

function showTab(tabKey) {
    document.querySelectorAll(".tab-pane").forEach(function (pane) { pane.style.display = "none"; });
    const active = document.getElementById("tab-" + tabKey);
    if (active) active.style.display = "block";
}

async function loadEverything() {
    await Promise.all([
        loadActivityLogs(),
        loadUsers(),
        loadSiteReports()
    ]);
    renderAll();
}

async function loadActivityLogs() {
    try {
        const result = await apiGet("/ActivityLog");
        activityLogs = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadUsers() {
    try {
        usersPage = await apiGet("/SiteAdmin/accounts?pageNumber=1&pageSize=100");
        allUsers = (usersPage && usersPage.items) ? usersPage.items : [];
    } catch (error) { console.error(error); }
}

async function loadSiteReports() {
    try {
        const result = await apiGet("/SiteReport");
        siteReports = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

function renderAll() {
    renderActivityLog();
    renderAccounts();
    renderSiteReports();
}

function renderActivityLog() {
    const container = document.getElementById("tab-activity-log");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Activity log</h2><div class="sub">Recent system events.</div></div></div>';

    if (activityLogs.length === 0) {
        html += '<div class="empty">No activity yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Type</th><th>Message</th><th>User</th><th>Time</th></tr>';
    activityLogs.forEach(function (log) {
        let tagClass = "";
        if (log.type === "error") tagClass = "bad";
        else if (log.type === "warn") tagClass = "warn";
        else if (log.type === "info") tagClass = "good";

        html +=
            '<tr>' +
                '<td><span class="tag ' + tagClass + '">' + escapeHtml(log.type) + '</span></td>' +
                '<td>' + escapeHtml(log.message) + '</td>' +
                '<td>' + (log.userId ? '#' + log.userId : '—') + '</td>' +
                '<td>' + formatDate(log.createdAt) + '</td>' +
            '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
}

function renderAccounts() {
    const container = document.getElementById("tab-accounts");
    if (!container) return;

    const filtered = allUsers.filter(function (user) {
        const search = accountsSearchValue.toLowerCase();
        const matchesSearch = !search ||
            (user.fullName || "").toLowerCase().includes(search) ||
            (user.email || "").toLowerCase().includes(search) ||
            (user.studentId || "").toLowerCase().includes(search) ||
            String(user.userId).includes(search);

        const matchesRole = accountsRoleFilter === "all" || user.role === accountsRoleFilter;

        return matchesSearch && matchesRole;
    });

    let html =
        '<div class="section-head">' +
            '<div><h2>Manage users</h2><div class="sub">Search, create, edit, or remove accounts.</div></div>' +
            '<button class="btn sm" onclick="openCreateAccountModal()">+ Create account</button>' +
        '</div>';

    html +=
        '<div class="head-actions" style="margin-bottom:16px">' +
            '<div class="search-box">' +
                '<input id="accSearch" placeholder="Search by ID, name, email..." value="' + escapeHtml(accountsSearchValue) + '" oninput="onAccountSearch(this.value)">' +
            '</div>' +
            '<select class="filter-select" onchange="onAccountRoleFilter(this.value)">' +
                '<option value="all"' + (accountsRoleFilter === "all" ? " selected" : "") + '>All roles</option>' +
                '<option value="Student"' + (accountsRoleFilter === "Student" ? " selected" : "") + '>Students</option>' +
                '<option value="Executive"' + (accountsRoleFilter === "Executive" ? " selected" : "") + '>Executives</option>' +
                '<option value="IcbtAdmin"' + (accountsRoleFilter === "IcbtAdmin" ? " selected" : "") + '>ICBT Admins</option>' +
                '<option value="SuperAdmin"' + (accountsRoleFilter === "SuperAdmin" ? " selected" : "") + '>Site Admins</option>' +
            '</select>' +
        '</div>';

    if (filtered.length === 0) {
        html += '<div class="empty">No users match your filters.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>#</th><th>Name</th><th>Email</th><th>Student ID</th><th>Role</th><th>Status</th><th>Actions</th></tr>';
    filtered.forEach(function (user) {
        html +=
            '<tr>' +
                '<td>' + user.userId + '</td>' +
                '<td>' + escapeHtml(user.fullName) + '</td>' +
                '<td>' + escapeHtml(user.email) + '</td>' +
                '<td>' + escapeHtml(user.studentId || "—") + '</td>' +
                '<td>' + escapeHtml(getRoleLabel(user.role)) + '</td>' +
                '<td>' + (user.isActive ? '<span class="tag good">Active</span>' : '<span class="tag bad">Suspended</span>') + '</td>' +
                '<td style="white-space:nowrap">' +
                    (user.isActive
                        ? '<button class="btn ghost sm" onclick="suspendUser(' + user.userId + ')">Suspend</button>'
                        : '<button class="btn good sm" onclick="activateUser(' + user.userId + ')">Activate</button>') +
                    
                    '<button class="btn ghost sm" style="margin-left:6px" onclick="deleteUser(' + user.userId + ')">Delete</button>' +
                '</td>' +
            '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
}

function onAccountSearch(value) {
    accountsSearchValue = value;
    renderAccounts();
}

function onAccountRoleFilter(value) {
    accountsRoleFilter = value;
    renderAccounts();
}

function openCreateAccountModal() {
    openModal(
        '<h3>Create account</h3>' +
        '<div class="field"><label>Role</label>' +
            '<select id="caRole" onchange="toggleStudentFields()">' +
                '<option value="Student">Student</option>' +
                '<option value="IcbtAdmin">ICBT Admin</option>' +
                '<option value="SuperAdmin">Site Admin</option>' +
            '</select>' +
        '</div>' +
        '<div class="field"><label>Full name</label><input id="caFullName" maxlength="100"></div>' +
        '<div class="field"><label>Email</label><input id="caEmail" type="email" maxlength="100"></div>' +
        '<div class="field"><label>Password (min 8, letter + number)</label><input id="caPassword" type="password"></div>' +
        '<div class="field"><label>Phone</label><input id="caPhone" maxlength="15" placeholder="+94771234567"></div>' +
        '<div id="caStudentFields">' +
            '<div class="field"><label>Student ID</label><input id="caStudentId" maxlength="20"></div>' +
            '<div class="field"><label>Semester</label><input id="caSemester" maxlength="20" placeholder="e.g. Semester 4"></div>' +
        '</div>' +
        '<div id="caMessage" class="alert hidden"></div>' +
        '<button class="btn full" onclick="submitCreateAccount()">Create account</button>'
    );
}

function toggleStudentFields() {
    const role = document.getElementById("caRole").value;
    const wrapper = document.getElementById("caStudentFields");
    if (role === "Student") {
        wrapper.style.display = "block";
    } else {
        wrapper.style.display = "none";
    }
}

async function submitCreateAccount() {
    const message = document.getElementById("caMessage");
    message.className = "alert hidden";
    message.textContent = "";

    const role = document.getElementById("caRole").value;
    const body = {
        fullName: document.getElementById("caFullName").value.trim(),
        email: document.getElementById("caEmail").value.trim(),
        password: document.getElementById("caPassword").value,
        phoneNumber: document.getElementById("caPhone").value.trim(),
        role: role,
        studentId: role === "Student" ? document.getElementById("caStudentId").value.trim() : null,
        semester: role === "Student" ? document.getElementById("caSemester").value.trim() : null
    };

    if (!body.fullName) {
        showModalError(message, "Full name is required.");
        return;
    }

    if (!isValidName(body.fullName)) {
        showModalError(message, "Full name can only contain letters and spaces.");
        return;
    }

    if (!body.email) {
        showModalError(message, "Email is required.");
        return;
    }

    if (!isValidEmail(body.email)) {
        showModalError(message, "Please enter a valid email address.");
        return;
    }

    if (!isGmailAddress(body.email)) {
        showModalError(message, "Email must end with @gmail.com");
        return;
    }

    if (!body.password) {
        showModalError(message, "Password is required.");
        return;
    }

    if (body.password.length < 8) {
        showModalError(message, "Password must be at least 8 characters.");
        return;
    }

    if (!isStrongPassword(body.password)) {
        showModalError(message, "Password must contain at least one letter and one number.");
        return;
    }

    if (!body.phoneNumber) {
        showModalError(message, "Phone number is required.");
        return;
    }

    if (!isValidSriLankanPhone(body.phoneNumber)) {
        showModalError(message, "Phone number must be in the format +947XXXXXXXX");
        return;
    }

    if (role === "Student") {
        if (!body.studentId) {
            showModalError(message, "Student ID is required for students.");
            return;
        }
        if (!body.semester) {
            showModalError(message, "Semester is required for students.");
            return;
        }
    }

    if (!confirm("Confirm create account?")) return;

    const result = await apiPost("/SiteAdmin/accounts", body);

    if (!result.ok) {
        if (result.data && result.data.errors) {
            showModalError(message, getFirstValidationError(result.data.errors));
            return;
        }
        if (result.data && result.data.message) {
            showModalError(message, result.data.message);
            return;
        }
        showModalError(message, "Could not create account.");
        return;
    }

    closeModal();
    showToast("Account created", "success");
    await loadUsers();
    renderAccounts();
}

function openResetPasswordModal(userId) {
    const user = allUsers.find(function (u) { return u.userId === userId; });
    if (!user) return;

    openModal(
        '<h3>Reset password</h3>' +
        '<div class="meta" style="margin-bottom:14px">' + escapeHtml(user.fullName) + ' — ' + escapeHtml(user.email) + '</div>' +
        '<div class="field"><label>New password (min 8, letter + number)</label><input id="rpPassword" type="password"></div>' +
        '<div id="rpMessage" class="alert hidden"></div>' +
        '<button class="btn full" onclick="submitResetPassword(' + userId + ')">Reset password</button>'
    );
}

async function submitResetPassword(userId) {
    const message = document.getElementById("rpMessage");
    message.className = "alert hidden";
    message.textContent = "";

    const password = document.getElementById("rpPassword").value;

    if (!password) {
        showModalError(message, "Password is required.");
        return;
    }

    if (password.length < 8) {
        showModalError(message, "Password must be at least 8 characters.");
        return;
    }

    if (!isStrongPassword(password)) {
        showModalError(message, "Password must contain at least one letter and one number.");
        return;
    }

    if (!confirm("Confirm password reset?")) return;

    const result = await apiPut("/SiteAdmin/accounts/" + userId + "/password", { newPassword: password });

    if (!result.ok) {
        if (result.data && result.data.errors) {
            showModalError(message, getFirstValidationError(result.data.errors));
            return;
        }
        showModalError(message, "Could not reset password.");
        return;
    }

    closeModal();
    showToast("Password reset", "success");
}

async function suspendUser(userId) {
    if (!confirm("Suspend this user?")) return;

    const result = await apiPut("/SiteAdmin/accounts/" + userId + "/suspend", {});
    if (!result.ok) { showToast("Could not suspend", "error"); return; }
    showToast("User suspended", "success");
    await loadUsers();
    renderAccounts();
}

async function activateUser(userId) {
    if (!confirm("Activate this user?")) return;

    const result = await apiPut("/SiteAdmin/accounts/" + userId + "/activate", {});
    if (!result.ok) { showToast("Could not activate", "error"); return; }
    showToast("User activated", "success");
    await loadUsers();
    renderAccounts();
}

async function deleteUser(userId) {
    if (!confirm("Confirm delete user?")) return;

    const result = await apiDelete("/SiteAdmin/accounts/" + userId);
    if (!result.ok) { showToast("Could not delete", "error"); return; }
    showToast("User deleted", "success");
    await loadUsers();
    renderAccounts();
}

function renderSiteReports() {
    const container = document.getElementById("tab-site-reports");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Site reports</h2><div class="sub">User-submitted bug reports.</div></div></div>';

    if (siteReports.length === 0) {
        html += '<div class="empty">No reports yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>#</th><th>Title</th><th>Status</th><th>Submitted</th><th></th></tr>';
    siteReports.forEach(function (report) {
        let tagClass = "warn";
        if (report.status === "Resolved") tagClass = "good";
        if (report.status === "Rejected") tagClass = "bad";

        html +=
            '<tr>' +
                '<td>' + report.siteReportId + '</td>' +
                '<td>' + escapeHtml(report.title) + '</td>' +
                '<td><span class="tag ' + tagClass + '">' + escapeHtml(report.status) + '</span></td>' +
                '<td>' + formatDate(report.createdAt) + '</td>' +
                '<td>' +
                    '<button class="btn ghost sm" onclick="openReportDetail(' + report.siteReportId + ')">View</button>' +
                    '<button class="btn good sm" style="margin-left:6px" onclick="resolveReport(' + report.siteReportId + ')">Resolve</button>' +
                    '<button class="btn ghost sm" style="margin-left:6px" onclick="deleteReport(' + report.siteReportId + ')">Delete</button>' +
                '</td>' +
            '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
}

function openReportDetail(reportId) {
    const report = siteReports.find(function (r) { return r.siteReportId === reportId; });
    if (!report) return;

    openModal(
        '<h3>' + escapeHtml(report.title) + '</h3>' +
        '<div class="meta" style="margin-bottom:14px">Status: ' + escapeHtml(report.status) + ' · ' + formatDate(report.createdAt) + '</div>' +
        '<p style="font-size:14px;line-height:1.6;color:var(--ink-soft)">' + escapeHtml(report.description) + '</p>'
    );
}

async function resolveReport(reportId) {
    if (!confirm("Mark report as resolved?")) return;

    const result = await apiPut("/SiteReport/" + reportId + "/status", { status: "Resolved" });
    if (!result.ok) { showToast("Could not resolve", "error"); return; }
    showToast("Report resolved", "success");
    await loadSiteReports();
    renderSiteReports();
}

async function deleteReport(reportId) {
    if (!confirm("Confirm delete report?")) return;

    const result = await apiDelete("/SiteReport/" + reportId);
    if (!result.ok) { showToast("Could not delete", "error"); return; }
    showToast("Report deleted", "success");
    await loadSiteReports();
    renderSiteReports();
}