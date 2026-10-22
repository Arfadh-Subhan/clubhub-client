const API_BASE_URL = "http://localhost:5009/api";
const SESSION_KEY = "clubhub_user";

function getCurrentUser() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
}

function setCurrentUser(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
    sessionStorage.removeItem(SESSION_KEY);
}

function logout() {
    clearCurrentUser();
    window.location.href = getRootPath() + "index.html";
}

function getRootPath() {
    const path = window.location.pathname;
    if (path.includes("/pages/student/") || path.includes("/pages/executive/") || path.includes("/pages/icbt-admin/") || path.includes("/pages/site-admin/")) {
        return "../../";
    }
    if (path.includes("/pages/")) {
        return "../";
    }
    return "";
}

function isMemberView() {
    if (!window.location.pathname.includes("/pages/executive/dashboard.html")) return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "member";
}

function getDashboardPath(role) {
    if (role === "Student") return "pages/student/dashboard.html";
    if (role === "Executive") return "pages/executive/dashboard.html";
    if (role === "IcbtAdmin") return "pages/icbt-admin/dashboard.html";
    if (role === "SuperAdmin") return "pages/site-admin/dashboard.html";
    return "index.html";
}

function getRoleLabel(role) {
    if (role === "Student") return "Student";
    if (role === "Executive") return "Executive";
    if (role === "IcbtAdmin") return "ICBT Admin";
    if (role === "SuperAdmin") return "Site Admin";
    return "";
}

function requireLogin() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = getRootPath() + "pages/login.html";
        return null;
    }
    return user;
}

async function apiGet(url) {
    const response = await fetch(API_BASE_URL + url);
    if (!response.ok) throw new Error("Request failed: " + response.status);
    return await response.json();
}

async function apiPost(url, body) {
    const response = await fetch(API_BASE_URL + url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    let data = null;
    try { data = await response.json(); } catch (error) { data = null; }
    return { ok: response.ok, status: response.status, data: data };
}

async function apiPut(url, body) {
    const response = await fetch(API_BASE_URL + url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    let data = null;
    try { data = await response.json(); } catch (error) { data = null; }
    return { ok: response.ok, status: response.status, data: data };
}

async function apiDelete(url) {
    const response = await fetch(API_BASE_URL + url, { method: "DELETE" });
    let data = null;
    try { data = await response.json(); } catch (error) { data = null; }
    return { ok: response.ok, status: response.status, data: data };
}

function decodeImage(bytes) {
    if (!bytes) return null;
    return "data:image/png;base64," + bytes;
}

function escapeHtml(text) {
    if (text == null) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidName(name) {
    if (!name) return false;
    return /^[a-zA-Z\s]+$/.test(name.trim());
}

function isGmailAddress(email) {
    return email.trim().toLowerCase().endsWith("@gmail.com");
}

function isValidSriLankanPhone(phone) {
    if (!phone.startsWith("+947")) return false;
    if (phone.length !== 12) return false;
    for (let i = 1; i < phone.length; i++) {
        if (!/[0-9]/.test(phone.charAt(i))) return false;
    }
    return true;
}

function isStrongPassword(password) {
    return /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

function showModalError(messageElement, text) {
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

function openImageLightbox(src) {
    if (!src) return;

    const wrap = document.createElement("div");
    wrap.className = "image-lightbox";
    wrap.innerHTML =
        '<button type="button" class="image-lightbox-close" aria-label="Close">&times;</button>' +
        '<img src="' + src + '" alt="">';

    const img = wrap.querySelector("img");

    img.addEventListener("click", function (e) {
        e.stopPropagation();
        img.classList.toggle("zoomed");
    });

    wrap.addEventListener("click", function (e) {
        if (e.target === wrap || e.target.classList.contains("image-lightbox-close")) {
            wrap.remove();
        }
    });

    document.body.appendChild(wrap);

    const escHandler = function (e) {
        if (e.key === "Escape") {
            wrap.remove();
            document.removeEventListener("keydown", escHandler);
        }
    };
    document.addEventListener("keydown", escHandler);
}

function renderTopnav() {
    const container = document.getElementById("topnav");
    if (!container) return;

    const user = getCurrentUser();
    const root = getRootPath();

    let rightHtml = "";

    if (user) {
        const initial = user.fullName ? user.fullName.charAt(0).toUpperCase() : "U";
        const photoUri = decodeImage(user.profilePhoto);
        const avatarInner = photoUri
            ? '<img src="' + photoUri + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
            : initial;

        const switchHtml = isMemberView()
            ? '<a class="dropdown-item" href="' + root + 'pages/student/dashboard.html?tab=my-clubs">Switch to Student Platform</a>'
            : "";

        rightHtml =
            '<button class="bell-round" type="button" onclick="toggleNotifPanel(event)" aria-label="Notifications">' +
                '<svg viewBox="0 0 448 512" class="bell-svg">' +
                    '<path d="M224 0c-17.7 0-32 14.3-32 32V49.9C119.5 61.4 64 124.2 64 200v33.4c0 45.4-15.5 89.5-43.8 124.9L5.3 377c-5.8 7.2-6.9 17.1-2.9 25.4S14.8 416 24 416H424c9.2 0 17.6-5.3 21.6-13.6s2.9-18.2-2.9-25.4l-14.9-18.6C399.5 322.9 384 278.8 384 233.4V200c0-75.8-55.5-138.6-128-150.1V32c0-17.7-14.3-32-32-32zm0 96h8c57.4 0 104 46.6 104 104v33.4c0 47.9 13.9 94.6 39.7 134.6H72.3C98.1 328 112 281.3 112 233.4V200c0-57.4 46.6-104 104-104h8zm64 352H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z"></path>' +
                '</svg>' +
                '<span class="bell-dot hidden" id="bellDot" style="display:none">0</span>' +
                '<div class="notif-panel" id="notifPanel"></div>' +
            '</button>' +
            '<div class="dropdown">' +
                '<button class="dropdown-toggle" type="button" onclick="toggleProfileMenu(event)">' +
                    '<span class="dropdown-avatar" style="overflow:hidden">' + avatarInner + '</span>' +
                    '<span>' + escapeHtml(user.fullName) + '</span>' +
                '</button>' +
                '<div id="profileMenu" class="dropdown-menu hidden">' +
                    '<div class="dropdown-header">' +
                        '<div class="dropdown-header-name">' + escapeHtml(user.fullName) + '</div>' +
                        '<div class="dropdown-header-role">' + getRoleLabel(user.role) + '</div>' +
                    '</div>' +
                    '<a class="dropdown-item" href="' + root + 'pages/profile.html">My Profile</a>' +
                    switchHtml +
                    '<button class="dropdown-item" type="button" onclick="logout()">Sign out</button>' +
                '</div>' +
            '</div>';
    } else {
        rightHtml =
            '<span class="nav-link" onclick="openHelpModal()">Help</span>' +
            '<button class="btn sm" type="button" onclick="openLoginModal()">Login</button>';
    }

    container.innerHTML =
        '<div class="brand" onclick="window.location.href=\'' + root + 'index.html\'">' +
            '<img class="brand-logo" src="' + root + 'assets/images/ClubHubLogo.png" alt="ClubHub">' +
            '<span class="brand-text">ClubHub</span>' +
        '</div>' +
        '<div class="navright">' + rightHtml + '</div>';
}

function renderSidebar(activeKey) {
    const container = document.getElementById("sidebar");
    if (!container) return;

    const user = getCurrentUser();
    const root = getRootPath();

    let topBlock = "";
    if (user) {
        const roleLabel = isMemberView() ? "Club member" : getRoleLabel(user.role);
        topBlock =
            '<div class="sidebar-user">' +
                '<div class="user-name">' + escapeHtml(user.fullName) + '</div>' +
                '<div class="user-role">' + roleLabel + '</div>' +
            '</div>';
    } else {
        topBlock =
            '<div class="sidebar-user">' +
                '<div class="sidebar-login-hint">' +
                    'Please <a onclick="openLoginModal()">log in</a> to continue.' +
                '</div>' +
            '</div>';
    }

    const items = getSidebarItemsForRole(user);

    let menuHtml = '<nav class="sidebar-menu">';
    items.forEach(function (item) {
        const activeClass = item.key === activeKey ? " active" : "";
        const badgeHtml = '<span class="nav-badge" data-nav-key="' + item.key + '" style="display:none">0</span>';
        const iconHtml = getIconForNavKey(item.key);
        
        if (user) {
            menuHtml += '<a class="navitem' + activeClass + '" href="' + root + item.href + '" data-nav-item="' + item.key + '">' + iconHtml + '<span>' + escapeHtml(item.label) + '</span>' + badgeHtml + '</a>';
        } else if (item.isPublic) {
            menuHtml += '<a class="navitem' + activeClass + '" href="' + root + item.href + '" data-nav-item="' + item.key + '">' + iconHtml + '<span>' + escapeHtml(item.label) + '</span>' + badgeHtml + '</a>';
        } else {
            menuHtml += '<a class="navitem' + activeClass + '" onclick="openLoginModal()" data-nav-item="' + item.key + '">' + iconHtml + '<span>' + escapeHtml(item.label) + '</span>' + badgeHtml + '</a>';
        }
    });
    menuHtml += '</nav>';

    let logoutHtml = "";
    if (user) {
        logoutHtml =
            '<div class="sidebar-logout">' +
                '<button class="sidebar-logout-button" type="button" onclick="logout()">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>' +
                    '<span>Sign out</span>' +
                '</button>' +
            '</div>';
    }

    container.innerHTML = topBlock + menuHtml + logoutHtml;

    if (user) {
        refreshSidebarBadges();
    }
}

function getSidebarItemsForRole(user) {
    if (isMemberView()) return getMemberClubSidebarItems();
    if (!user) return getGuestSidebarItems();
    if (user.role === "Executive") return getExecutiveSidebarItems();
    if (user.role === "IcbtAdmin") return getIcbtAdminSidebarItems();
    if (user.role === "SuperAdmin") return getSiteAdminSidebarItems();
    return getStudentSidebarItems();
}

function getMemberClubSidebarItems() {
    const params = new URLSearchParams(window.location.search);
    const clubId = params.get("clubId") || "";
    const base = "pages/executive/dashboard.html?clubId=" + clubId + "&mode=member&tab=";
    return [
        { key: "back", label: "← Back to Student Platform", href: "pages/student/dashboard.html?tab=my-clubs" },
        { key: "events", label: "Events", href: base + "events" },
        { key: "meetings", label: "Meetings", href: base + "meetings" },
        { key: "board-members", label: "Board members", href: base + "board-members" },
        { key: "posts", label: "Projects & posts", href: base + "posts" },
        { key: "products", label: "Products", href: base + "products" },
        { key: "members", label: "Members", href: base + "members" },
        { key: "join-requests", label: "Join requests", href: base + "join-requests" },
        { key: "announcements", label: "Announcements", href: base + "announcements" },
        { key: "gallery", label: "Gallery", href: base + "gallery" },
        { key: "orders", label: "Orders", href: base + "orders" }
    ];
}

function getGuestSidebarItems() {
    return [
        { key: "browse-events", label: "Browse events", href: "pages/events.html", isPublic: true },
        { key: "clubs", label: "Clubs & societies", href: "pages/clubs.html", isPublic: true },
        { key: "my-clubs", label: "My clubs & societies", href: "pages/student/dashboard.html?tab=my-clubs" },
        { key: "reminders", label: "Reminders", href: "pages/student/dashboard.html?tab=reminders" },
        { key: "my-orders", label: "My orders", href: "pages/student/dashboard.html?tab=my-orders" },
        { key: "request-club", label: "Request a club", href: "pages/student/dashboard.html?tab=request-club" }
    ];
}

function getStudentSidebarItems() {
    return [
        { key: "browse-events", label: "Browse events", href: "pages/student/dashboard.html?tab=browse-events" },
        { key: "clubs", label: "Clubs & societies", href: "pages/clubs.html" },
        { key: "my-clubs", label: "My clubs & societies", href: "pages/student/dashboard.html?tab=my-clubs" },
        { key: "reminders", label: "Reminders", href: "pages/student/dashboard.html?tab=reminders" },
        { key: "my-orders", label: "My orders", href: "pages/student/dashboard.html?tab=my-orders" },
        { key: "request-club", label: "Request a club", href: "pages/student/dashboard.html?tab=request-club" }
    ];
}

function getExecutiveSidebarItems() {
    return [
        { key: "club-settings", label: "Club settings", href: "pages/executive/dashboard.html?tab=club-settings" },
        { key: "events", label: "Events", href: "pages/executive/dashboard.html?tab=events" },
        { key: "meetings", label: "Meetings", href: "pages/executive/dashboard.html?tab=meetings" },
        { key: "board-members", label: "Board members", href: "pages/executive/dashboard.html?tab=board-members" },
        { key: "posts", label: "Projects & posts", href: "pages/executive/dashboard.html?tab=posts" },
        { key: "products", label: "Products", href: "pages/executive/dashboard.html?tab=products" },
        { key: "members", label: "Members", href: "pages/executive/dashboard.html?tab=members" },
        { key: "join-requests", label: "Join requests", href: "pages/executive/dashboard.html?tab=join-requests" },
        { key: "announcements", label: "Announcements", href: "pages/executive/dashboard.html?tab=announcements" },
        { key: "gallery", label: "Gallery", href: "pages/executive/dashboard.html?tab=gallery" },
        { key: "orders", label: "Orders", href: "pages/executive/dashboard.html?tab=orders" }
    ];
}

function getIcbtAdminSidebarItems() {
    return [
        { key: "societies", label: "Societies", href: "pages/icbt-admin/dashboard.html?tab=societies" },
        { key: "campus-events", label: "Campus events", href: "pages/icbt-admin/dashboard.html?tab=campus-events" },
        { key: "approvals", label: "Pending approvals", href: "pages/icbt-admin/dashboard.html?tab=approvals" },
        { key: "club-requests", label: "Club requests", href: "pages/icbt-admin/dashboard.html?tab=club-requests" },
        { key: "users", label: "Manage users", href: "pages/icbt-admin/dashboard.html?tab=users" },
        { key: "add-executive", label: "Add Executive", href: "pages/icbt-admin/dashboard.html?tab=add-executive" },
        { key: "analytics", label: "Analytics", href: "pages/icbt-admin/dashboard.html?tab=analytics" }
    ];
}

function getSiteAdminSidebarItems() {
    return [
        { key: "activity-log", label: "Activity log", href: "pages/site-admin/dashboard.html?tab=activity-log" },
        { key: "accounts", label: "Accounts", href: "pages/site-admin/dashboard.html?tab=accounts" },
        { key: "site-reports", label: "Site reports", href: "pages/site-admin/dashboard.html?tab=site-reports" }
    ];
}

function getIconForNavKey(key) {
    const icons = {
        "browse-events": '<svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>',
        "clubs": '<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>',
        "my-clubs": '<svg viewBox="0 0 24 24"><path d="M12 2l-5.5 9h11z"/><circle cx="17.5" cy="17.5" r="4.5"/><path d="M3 13.5h8v8H3z"/></svg>',
        "reminders": '<svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
        "my-orders": '<svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>',
        "request-club": '<svg viewBox="0 0 24 24"><path d="M11 7h2v10h-2z"/><path d="M7 11h10v2H7z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>',
        "club-settings": '<svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.49l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>',
        "events": '<svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>',
        "meetings": '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
        "board-members": '<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>',
        "posts": '<svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>',
        "products": '<svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>',
        "members": '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
        "join-requests": '<svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
        "announcements": '<svg viewBox="0 0 24 24"><path d="M3 17v-2c0-2.66 5.33-4 8-4s8 1.34 8 4v2H3zm13-9c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z"/></svg>',
        "gallery": '<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
        "orders": '<svg viewBox="0 0 24 24"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 1.1.9 2 2 2s2-.9 2-2V8h2v2c0 1.1.9 2 2 2s2-.9 2-2V8h2v12z"/></svg>',
        "societies": '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>',
        "campus-events": '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
        "approvals": '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
        "club-requests": '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
        "users": '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
        "add-executive": '<svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
        "analytics": '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>',
        "activity-log": '<svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>',
        "accounts": '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>',
        "site-reports": '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
        "back": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>'
    };
    return icons[key] || '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.3"/></svg>';
}

function renderPulse(stats) {
    const container = document.getElementById("pulse");
    if (!container) return;
    container.innerHTML =
        '<div class="cell"><div class="n">' + stats.societies + '</div><div class="l">Societies on campus</div></div>' +
        '<div class="cell"><div class="n">' + stats.events + '</div><div class="l">Upcoming events</div></div>' +
        '<div class="cell"><div class="n">' + stats.clubs + '</div><div class="l">Clubs you\'ve joined</div></div>' +
        '<div class="cell"><div class="n">' + stats.attending + '</div><div class="l">Events you\'re attending</div></div>';
}

async function loadPulseForUser(user) {
    if (!user) return;
    try {
        const clubsPage = await apiGet("/Club?pageNumber=1&pageSize=1");
        const eventsPage = await apiGet("/Event?pageNumber=1&pageSize=1");
        const memberships = await apiGet("/ClubMember/user/" + user.userId);
        const rsvps = await apiGet("/EventRsvp/user/" + user.userId);
        renderPulse({
            societies: clubsPage && clubsPage.totalCount ? clubsPage.totalCount : 0,
            events: eventsPage && eventsPage.totalCount ? eventsPage.totalCount : 0,
            clubs: Array.isArray(memberships) ? memberships.filter(function (m) { return m.status === "Approved"; }).length : 0,
            attending: Array.isArray(rsvps) ? rsvps.length : 0
        });
    } catch (error) { console.error(error); }
}

function toggleProfileMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById("profileMenu");
    if (menu) menu.classList.toggle("hidden");
}

document.addEventListener("click", function () {
    const menu = document.getElementById("profileMenu");
    if (menu) menu.classList.add("hidden");
});

async function refreshBell() {
    const user = getCurrentUser();
    const dot = document.getElementById("bellDot");
    const panel = document.getElementById("notifPanel");
    if (!user || !dot || !panel) return;
    try {
        const list = await apiGet("/Notification/user/" + user.userId);
        const unread = Array.isArray(list) ? list.filter(function (n) { return !n.isRead; }).length : 0;
        if (unread > 0) {
            dot.style.display = "flex";
            dot.textContent = unread;
        } else {
            dot.style.display = "none";
        }
        renderNotifPanel(list);
    } catch (error) { console.error(error); }
}

function renderNotifPanel(list) {
    const panel = document.getElementById("notifPanel");
    if (!panel) return;

    let html =
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px 10px;border-bottom:1px solid var(--line);margin-bottom:6px">' +
            '<span style="font-weight:700;font-size:13px">Notifications</span>' +
            '<button type="button" onclick="markAllNotificationsRead(event)" style="background:none;border:none;color:var(--ink-soft);font-size:12px;cursor:pointer;text-decoration:underline">Mark all as read</button>' +
        '</div>';

    if (Array.isArray(list) && list.length > 0) {
        html += list.slice(0, 15).map(function (n) {
            return '<div class="notif-item' + (n.isRead ? "" : " unread") + '">' +
                '<div style="font-weight:600">' + escapeHtml(n.title) + '</div>' +
                '<div style="font-size:12.5px;color:var(--ink-soft);margin-top:2px">' + escapeHtml(n.message) + '</div>' +
                '<div class="t">' + formatDate(n.createdAt) + '</div>' +
            '</div>';
        }).join("");
    } else {
        html += '<div class="notif-item" style="color:var(--ink-faint)">No notifications yet.</div>';
    }

    panel.innerHTML = html;
}

async function toggleNotifPanel(event) {
    event.stopPropagation();
    const panel = document.getElementById("notifPanel");
    if (!panel) return;

    const isOpen = panel.classList.contains("open");

    if (isOpen) {
        panel.classList.remove("open");
        return;
    }

    panel.classList.add("open");

    const user = getCurrentUser();
    if (!user) return;

    const result = await apiPut("/Notification/user/" + user.userId + "/read-all", {});

    if (result.ok) {
        await refreshBell();
        await refreshSidebarBadges();
    }
}

async function markAllNotificationsRead(event) {
    event.stopPropagation();
    const user = getCurrentUser();
    if (!user) return;

    const result = await apiPut("/Notification/user/" + user.userId + "/read-all", {});

    if (result.ok) {
        await refreshBell();
        await refreshSidebarBadges();
        showToast("All notifications marked as read", "success");
    }
}

const STUDENT_NOTIFICATION_NAV = {
    "ClubRequest": "request-club",
    "ClubMember": "my-clubs",
    "Event": "browse-events",
    "ChatMessage": "my-clubs"
};

const ICBT_NOTIFICATION_NAV = {
    "ClubRequest": "club-requests",
    "ClubMember": "users",
    "Event": "approvals",
    "ChatMessage": null
};

async function refreshSidebarBadges() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const list = await apiGet("/Notification/user/" + user.userId);
        if (!Array.isArray(list)) return;

        const unread = list.filter(function (n) { return !n.isRead; });

        const counts = {};
        unread.forEach(function (n) {
            const navKey = navKeyForNotification(n, user);
            if (!navKey) return;
            counts[navKey] = (counts[navKey] || 0) + 1;
        });

        document.querySelectorAll("[data-nav-key]").forEach(function (badge) {
            const key = badge.getAttribute("data-nav-key");
            const count = counts[key] || 0;
            if (count > 0) {
                badge.style.display = "inline-block";
                badge.textContent = count;
            } else {
                badge.style.display = "none";
            }
        });
    } catch (error) {
        console.error(error);
    }
}

function navKeyForNotification(notification, user) {
    const type = notification.type;
    if (!type) return null;

    if (user.role === "Student") {
        return STUDENT_NOTIFICATION_NAV[type] || null;
    }
    if (user.role === "IcbtAdmin") {
        return ICBT_NOTIFICATION_NAV[type] || null;
    }
    if (user.role === "Executive") {
        if (type === "ClubMember") return "join-requests";
        if (type === "Event") return "events";
        return null;
    }
    return null;
}

function openModal(html) {
    const bg = document.getElementById("modalBg");
    const body = document.getElementById("modalBody");
    if (!bg || !body) return;
    body.innerHTML = '<button class="modal-close" type="button" onclick="closeModal()">×</button>' + html;
    bg.classList.add("active");
}

function closeModal() {
    const bg = document.getElementById("modalBg");
    if (bg) bg.classList.remove("active");
}

function openLoginModal() {
    if (document.getElementById("loginModal")) return;

    const root = getRootPath();

    const backdrop = document.createElement("div");
    backdrop.className = "modal-bg active";
    backdrop.id = "loginModal";
    backdrop.innerHTML =
        '<div class="modal" onclick="event.stopPropagation()" style="padding:36px 32px">' +
            '<button class="modal-close" type="button" onclick="closeLoginModal()">×</button>' +

            '<div style="text-align:center;margin-bottom:24px">' +
                '<img src="' + root + 'assets/images/ClubHubLogo.png" alt="ClubHub" style="width:52px;height:52px;object-fit:contain;margin:0 auto 8px">' +
                '<div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:var(--ink);margin-bottom:6px">ClubHub</div>' +
                '<h3 style="font-size:26px;font-weight:800;letter-spacing:-0.03em;color:var(--ink);margin:0 0 6px">Welcome back</h3>' +
                '<div style="font-size:13.5px;color:var(--ink-soft)">Please enter your details to sign in</div>' +
            '</div>' +

            '<form id="loginForm" novalidate>' +
                '<div class="field">' +
                    '<label>Your Email Address</label>' +
                    '<input type="email" id="loginEmail" maxlength="100" placeholder="Your Email Address" required>' +
                '</div>' +
                '<div class="field">' +
                    '<label>Password</label>' +
                    '<input type="password" id="loginPassword" placeholder="••••••••••" required>' +
                '</div>' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin:4px 0 20px">' +
                    '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-soft);cursor:pointer">' +
                        '<input type="checkbox" id="rememberMe" style="width:auto;margin:0">' +
                        'Remember me' +
                    '</label>' +
                    '<a style="font-size:13px;font-weight:600;color:var(--ink);text-decoration:underline;cursor:pointer" onclick="showForgotPasswordHint(event)">Forgot password?</a>' +
                '</div>' +
                '<div id="loginMessage" class="alert hidden"></div>' +
                '<button class="btn full lg" type="submit">Sign In</button>' +
            '</form>' +

            '<div style="text-align:center;font-size:13.5px;color:var(--ink-soft);margin-top:20px">' +
                "Don't have an account? <a href='" + root + "pages/register.html' style='color:var(--ink);font-weight:700;text-decoration:underline'>Sign up</a>" +
            '</div>' +
        '</div>';

    backdrop.addEventListener("click", closeLoginModal);
    document.body.appendChild(backdrop);
    document.getElementById("loginForm").addEventListener("submit", handleLoginSubmit);
}

function closeLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) modal.remove();
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const message = document.getElementById("loginMessage");
    message.className = "alert hidden";
    message.textContent = "";

    if (!email) {
        showModalError(message, "Email is required.");
        return;
    }

    if (!isValidEmail(email)) {
        showModalError(message, "Please enter a valid email address.");
        return;
    }

    if (!password) {
        showModalError(message, "Password is required.");
        return;
    }

    const result = await apiPost("/Auth/login", { email: email, password: password });

    if (!result.ok) {
        if (result.data && result.data.errors) {
            showModalError(message, getFirstValidationError(result.data.errors));
            return;
        }

        showModalError(message, (result.data && result.data.message) ? result.data.message : "Login failed.");
        return;
    }

    setCurrentUser(result.data.user);
    window.location.href = getRootPath() + getDashboardPath(result.data.user.role);
}

function openHelpModal() {
    openModal(
        '<h3>Help &amp; support</h3>' +
        '<div class="eyebrow" style="margin-bottom:8px">FAQ</div>' +
        '<details><summary>How do I join a club?</summary><p style="font-size:12.5px;color:var(--ink-soft);margin-top:8px">Browse clubs and send a request — the club board reviews it.</p></details>' +
        '<details><summary>Why isn\'t my event showing yet?</summary><p style="font-size:12.5px;color:var(--ink-soft);margin-top:8px">New events go to the ICBT admin team for approval first.</p></details>' +
        '<details><summary>How do I get a refund on merch?</summary><p style="font-size:12.5px;color:var(--ink-soft);margin-top:8px">Contact the club board directly.</p></details>' +
        '<div class="eyebrow" style="margin:20px 0 8px">Contact support</div>' +
        '<div class="field"><label>Name</label><input id="supName" maxlength="100"></div>' +
        '<div class="field"><label>Email</label><input id="supEmail" type="email" maxlength="100"></div>' +
        '<div class="field"><label>Message</label><textarea id="supMsg" maxlength="2000"></textarea></div>' +
        '<div id="supMessage" class="alert hidden"></div>' +
        '<button class="btn full" onclick="submitSupportMessage()">Send message</button>'
    );
}

async function submitSupportMessage() {
    const name = document.getElementById("supName").value.trim();
    const email = document.getElementById("supEmail").value.trim();
    const messageText = document.getElementById("supMsg").value.trim();
    const message = document.getElementById("supMessage");
    message.className = "alert hidden";
    message.textContent = "";

    if (!name) {
        showModalError(message, "Name is required.");
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

    if (!messageText) {
        showModalError(message, "Message is required.");
        return;
    }

    const user = getCurrentUser();
    const body = {
        userId: user ? user.userId : null,
        title: "Support message from " + name + " (" + email + ")",
        description: messageText
    };
    const result = await apiPost("/SiteReport", body);
    if (!result.ok) {
        if (result.data && result.data.errors) {
            showModalError(message, getFirstValidationError(result.data.errors));
            return;
        }
        showModalError(message, "Could not send — try again.");
        return;
    }
    closeModal();
    showToast("Message sent — we will follow up by email", "success");
}

function openReportModal() {
    openModal(
        '<h3>Report an issue</h3>' +
        '<div class="field"><label>Title</label><input id="reportTitle" maxlength="200" required></div>' +
        '<div class="field"><label>Description</label><textarea id="reportDescription" maxlength="2000" required></textarea></div>' +
        '<div id="reportMessage" class="alert hidden"></div>' +
        '<button class="btn full" onclick="submitReport()">Submit report</button>'
    );
}

async function submitReport() {
    const user = getCurrentUser();
    const title = document.getElementById("reportTitle").value.trim();
    const description = document.getElementById("reportDescription").value.trim();
    const message = document.getElementById("reportMessage");
    message.className = "alert hidden";
    message.textContent = "";

    if (!title) {
        showModalError(message, "Title is required.");
        return;
    }

    if (!description) {
        showModalError(message, "Description is required.");
        return;
    }

    const body = {
        userId: user ? user.userId : null,
        title: title,
        description: description
    };
    const result = await apiPost("/SiteReport", body);
    if (!result.ok) {
        if (result.data && result.data.errors) {
            showModalError(message, getFirstValidationError(result.data.errors));
            return;
        }
        showModalError(message, "Could not submit report.");
        return;
    }
    closeModal();
    showToast("Report submitted. Thank you!", "success");
}

function showToast(text, type) {
    let toast = document.getElementById("appToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "toast";
        toast.id = "appToast";
        document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.className = "toast show";
    if (type === "error") toast.style.background = "var(--bad)";
    else if (type === "success") toast.style.background = "var(--good)";
    else toast.style.background = "var(--ink)";
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
}

function renderReportButton() {
    if (document.getElementById("reportButton")) return;
    const button = document.createElement("button");
    button.className = "btn-fill report-fill";
    button.id = "reportButton";
    button.type = "button";
    button.innerHTML =
        '<svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>' +
            '<line x1="12" y1="9" x2="12" y2="13"></line>' +
            '<line x1="12" y1="17" x2="12.01" y2="17"></line>' +
        '</svg>';
    button.addEventListener("click", openReportModal);
    document.body.appendChild(button);

    const hasChat = document.getElementById("chatSidebar");
    if (hasChat) {
        button.style.right = "344px";
    }
}

function renderScrollTopButton() {
    if (document.getElementById("scrollTopBtn")) return;

    const button = document.createElement("button");
    button.className = "scroll-top-btn";
    button.id = "scrollTopBtn";
    button.type = "button";
    button.innerHTML =
        '<svg class="scroll-arrow" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z"></path>' +
        '</svg>';

    button.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.body.appendChild(button);

    const hasChat = document.getElementById("chatSidebar");
    if (hasChat) {
        button.style.right = "344px";
    }

    window.addEventListener("scroll", function () {
        const btn = document.getElementById("scrollTopBtn");
        if (!btn) return;
        if (window.scrollY > 300) {
            btn.classList.add("visible");
        } else {
            btn.classList.remove("visible");
        }
    }, { passive: true });
}

function renderEventSkeletons(container, count) {
    if (!container) return;

    let html = '<div class="skeleton-grid">';
    for (let i = 0; i < (count || 3); i++) {
        html +=
            '<div class="skeleton-card skeleton-event">' +
                '<div class="sk-block sk-photo"></div>' +
                '<div class="sk-body">' +
                    '<div class="sk-block sk-avatar"></div>' +
                    '<div class="sk-block sk-title" style="margin-top:6px"></div>' +
                    '<div class="sk-block sk-text"></div>' +
                    '<div class="sk-block sk-text" style="width:60%"></div>' +
                    '<div class="sk-block sk-pill"></div>' +
                '</div>' +
            '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
}

function renderFeedSkeletons(container, count) {
    if (!container) return;

    let html = "";
    for (let i = 0; i < (count || 2); i++) {
        html +=
            '<div class="skeleton-card skeleton-event" style="height:520px">' +
                '<div class="sk-block sk-photo" style="height:320px"></div>' +
                '<div class="sk-body">' +
                    '<div class="sk-block sk-avatar"></div>' +
                    '<div class="sk-block sk-title" style="margin-top:6px"></div>' +
                    '<div class="sk-block sk-text"></div>' +
                    '<div class="sk-block sk-text" style="width:70%"></div>' +
                    '<div class="sk-block sk-pill"></div>' +
                '</div>' +
            '</div>';
    }
    container.innerHTML = html;
}

function ensureModalShell() {
    if (document.getElementById("modalBg")) return;
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.id = "modalBg";
    bg.innerHTML = '<div class="modal" id="modalBody" onclick="event.stopPropagation()"></div>';
    bg.addEventListener("click", closeModal);
    document.body.appendChild(bg);
}

function showForgotPasswordHint(event) {
    event.preventDefault();
    closeLoginModal();
    openModal(
        '<h3>Reset your password</h3>' +
        '<p style="font-size:14px;color:var(--ink-soft);line-height:1.65;margin-bottom:20px">' +
            'To reset your password, please visit the ICBT administration office with your student ID card. ' +
            'An administrator will verify your identity and issue a new password for your account.' +
        '</p>' +
        '<div style="font-size:13px;color:var(--ink-soft);line-height:1.9;background:var(--panel);padding:14px 16px;border-radius:var(--radius-sm);margin-bottom:20px">' +
            '<div><b>Location:</b> ICBT Campus, Admin Block</div>' +
            '<div><b>Hours:</b> 9:00 AM – 4:00 PM, Weekdays</div>' +
            '<div><b>Bring:</b> Your student ID card</div>' +
        '</div>' +
        '<button class="btn full" type="button" onclick="closeModal()">Close</button>'
    );
}

function buildDropZone(inputId, acceptTypes) {
    let subText = "Image files only";
    if (acceptTypes.includes('pdf')) subText = "PDF or Image";
    if (acceptTypes.includes('.doc')) subText = "PDF or DOC";

    return '<label class="drop-zone" for="' + inputId + '">' +
        '<svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>' +
        '<div class="drop-zone-title">Click or drag file here</div>' +
        '<div class="drop-zone-sub">' + subText + '</div>' +
        '<input type="file" id="' + inputId + '" accept="' + acceptTypes + '">' +
    '</label>';
}

function renderBackButton() {
    const page = document.body.dataset.page;
    if (page !== "event-detail" && page !== "club-detail" && page !== "product-detail" && page !== "post-detail") return;

    const main = document.querySelector(".main");
    if (!main) return;
    if (main.querySelector(".page-back")) return;

    const wrap = document.createElement("div");
    wrap.className = "page-back";

    const button = document.createElement("button");
    button.className = "back-btn";
    button.type = "button";

    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    const clubId = params.get("clubId");

    let label = "Back";
    let fallback = "index.html";

    if (page === "club-detail") {
        label = "Back to Clubs";
        fallback = "pages/clubs.html";
    } else if (page === "event-detail") {
        label = "Back to Events";
        fallback = "pages/events.html";
    } else if (page === "product-detail") {
        if (from === "executive") {
            label = "Back to Products";
            fallback = "pages/executive/dashboard.html?tab=products";
        } else if (from === "admin") {
            label = "Back to Approvals";
            fallback = "pages/icbt-admin/dashboard.html?tab=approvals";
        } else if (from === "manage" && clubId) {
            label = "Back to Club";
            fallback = "pages/club-manage.html?clubId=" + clubId;
        } else if (clubId) {
            label = "Back to Club";
            fallback = "pages/club-detail.html?clubId=" + clubId;
        } else {
            label = "Back to Clubs";
            fallback = "pages/clubs.html";
        }
    } else if (page === "post-detail") {
        if (from === "admin") {
            label = "Back to Approvals";
            fallback = "pages/icbt-admin/dashboard.html?tab=approvals";
        } else {
            label = "Back";
            fallback = "index.html";
        }
    }

    button.innerHTML =
        '<svg height="16" width="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true">' +
            '<path d="M874.690416 495.52477c0 11.2973-9.168824 20.466124-20.466124 20.466124l-604.773963 0 188.083679 188.083679c7.992021 7.992021 7.992021 20.947078 0 28.939099-4.001127 3.990894-9.240455 5.996574-14.46955 5.996574-5.239328 0-10.478655-1.995447-14.479783-5.996574l-223.00912-223.00912c-3.837398-3.837398-5.996574-9.046027-5.996574-14.46955 0-5.433756 2.159176-10.632151 5.996574-14.46955l223.019353-223.029586c7.992021-7.992021 20.957311-7.992021 28.949332 0 7.992021 8.002254 7.992021 20.957311 0 28.949332l-188.073446 188.073446 604.753497 0C865.521592 475.058646 874.690416 484.217237 874.690416 495.52477z"></path>' +
        '</svg>' +
        '<span>' + label + '</span>';

    button.addEventListener("click", function () {
        if (from && fallback) {
            window.location.href = getRootPath() + fallback;
            return;
        }
        if (document.referrer && document.referrer.startsWith(window.location.origin)) {
            history.back();
            return;
        }
        window.location.href = getRootPath() + fallback;
    });

    wrap.appendChild(button);
    main.prepend(wrap);
}

async function toggleEventLike(eventId, likeButtonElement) {
    const user = getCurrentUser();
    if (!user) {
        openLoginModal();
        return;
    }

    const result = await apiPost("/Like/toggle", { eventId: eventId, userId: user.userId });

    if (!result.ok) {
        showToast("Could not update like", "error");
        return;
    }

    const likeCount = result.data.like.likeCount;
    const isLiked = likeButtonElement.classList.contains("liked");

    const oneEl = likeButtonElement.querySelector(".like-count.one");
    const twoEl = likeButtonElement.querySelector(".like-count.two");

    if (isLiked) {
        likeButtonElement.classList.remove("liked");
        oneEl.textContent = likeCount;
        twoEl.textContent = likeCount + 1;
    } else {
        likeButtonElement.classList.add("liked");
        oneEl.textContent = likeCount - 1;
        twoEl.textContent = likeCount;
    }
}

function toggleShareMenu(event, buttonElement) {
    event.stopPropagation();

    const menu = buttonElement.parentElement.querySelector(".share-menu");
    if (!menu) return;

    document.querySelectorAll(".share-menu.open").forEach(function (openMenu) {
        if (openMenu !== menu) openMenu.classList.remove("open");
    });

    menu.classList.toggle("open");
}

document.addEventListener("click", function () {
    document.querySelectorAll(".share-menu.open").forEach(function (menu) {
        menu.classList.remove("open");
    });
});

async function shareEvent(channel, eventId, eventName, eventDate, eventVenue) {
    const shareUrl = window.location.origin + getRootPath() + "pages/event-detail.html?eventId=" + eventId;
    const shareText = eventName + " — " + eventDate + " at " + eventVenue + " (ClubHub)";

    if (channel === "whatsapp") {
        window.open("https://wa.me/?text=" + encodeURIComponent(shareText + " " + shareUrl), "_blank");
        return;
    }

    if (channel === "copy") {
        try {
            await navigator.clipboard.writeText(shareUrl);
            showToast("Link copied", "success");
        } catch (error) {
            showToast("Could not copy link", "error");
        }
        return;
    }

    if (channel === "native") {
        if (navigator.share) {
            try {
                await navigator.share({ title: eventName, text: shareText, url: shareUrl });
            } catch (error) { }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                showToast("Link copied", "success");
            } catch (error) {
                showToast("Sharing not available", "error");
            }
        }
    }
}

function bootstrapPage(activeKey) {
    ensureModalShell();
    renderTopnav();
    renderSidebar(activeKey);
    renderReportButton();
    renderScrollTopButton();
    renderFooter();
    renderBackButton();

    const user = getCurrentUser();
    if (user) {
        refreshBell();
        refreshSidebarBadges();
    }
}

function renderFooter() {
    const container = document.getElementById("siteFooter");
    if (!container) return;

    const root = getRootPath();

    container.className = "site-footer";
    container.innerHTML =
        '<div class="site-footer-inner">' +
            '<div>' +
                '<div class="footer-brand">' +
                    '<img src="' + root + 'assets/images/ClubHubLogo.png" alt="ClubHub">' +
                    '<div class="footer-brand-name">Club<span>Hub</span></div>' +
                '</div>' +
                '<p class="footer-desc">The centralized digital campus ecosystem for ICBT Campus. Connecting students, executive boards, and academic leaders with streamlined event discovery and club governance.</p>' +
            '</div>' +

            '<div>' +
                '<h4>Platform Navigation</h4>' +
                '<ul>' +
                    '<li><a href="' + root + 'index.html">Home</a></li>' +
                    '<li><a href="' + root + 'pages/clubs.html">All Clubs &amp; Societies</a></li>' +
                    '<li><a href="' + root + 'pages/terms.html" target="_blank">Terms &amp; Conditions</a></li>' +
                    '<li><a href="' + root + 'pages/faq.html" target="_blank">FAQ</a></li>' +
                    '<li><a href="mailto:studentaffairs@icbt.lk?subject=ClubHub%20Support%20Request">Contact &amp; Support</a></li>' +
                '</ul>' +
            '</div>' +

            '<div>' +
                '<h4>Contact Us</h4>' +
                '<div class="footer-contact">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                    '<span>ICBT Colombo Main Campus, No 36, De Fonseka Place, Colombo 04</span>' +
                '</div>' +
                '<div class="footer-contact">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' +
                    '<span>+94 (11) 477 7888 / +94 (11) 258 1188</span>' +
                '</div>' +
                '<div class="footer-contact">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/></svg>' +
                    '<span>studentaffairs@icbt.lk | info@icbt.lk</span>' +
                '</div>' +
            '</div>' +
        '</div>' +

        '<div class="site-footer-bottom">' +
            '<div>© 2026 International College of Business and Technology (ICBT). All rights reserved.</div>' +
            '<div class="site-footer-bottom-links">' +
                '<a href="' + root + 'pages/terms.html" target="_blank">Terms &amp; Conditions</a>' +
                '<a href="' + root + 'pages/faq.html" target="_blank">FAQ</a>' +
                '<a href="#">Privacy Policy</a>' +
            '</div>' +
        '</div>';
}