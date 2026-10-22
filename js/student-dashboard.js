let currentUser = null;
let dashboardEvents = [];
let dashboardClubs = [];
let myMemberships = [];
let myReminders = [];
let myOrders = [];
let myClubRequests = [];
let selectedMyClubId = null;
let selectedCoverLetterBytes = null;

document.addEventListener("DOMContentLoaded", async function () {
    currentUser = requireLogin();
    if (!currentUser) return;

    bootstrapPage(getActiveTabKey());
    loadPulseForUser(currentUser);
    await loadDashboard();
    switchTabFromUrl();
});

function getActiveTabKey() {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "browse-events";
}

function switchTabFromUrl() {
    showTab(getActiveTabKey());
}

function showTab(tabKey) {
    document.querySelectorAll(".tab-pane").forEach(function (pane) { pane.style.display = "none"; });
    const active = document.getElementById("tab-" + tabKey);
    if (active) active.style.display = "block";
}

async function loadDashboard() {
    await Promise.all([
        loadClubs(),
        loadEvents(),
        loadMemberships(),
        loadReminders(),
        loadOrders(),
        loadClubRequests()
    ]);
    await loadLikeCounts();
    renderAll();
}

async function loadClubs() {
    try {
        const result = await apiGet("/Club?pageNumber=1&pageSize=100");
        dashboardClubs = (result && result.items) ? result.items : [];
    } catch (error) { console.error(error); }
}

async function loadEvents() {
    try {
        const result = await apiGet("/Event?pageNumber=1&pageSize=50");
        dashboardEvents = (result && result.items) ? result.items : [];
    } catch (error) { console.error(error); }
}

async function loadLikeCounts() {
    for (const eventItem of dashboardEvents) {
        try {
            const result = await apiGet("/Like/event/" + eventItem.eventId);
            if (result && typeof result.likeCount === "number") {
                eventItem.likeCount = result.likeCount;
            } else {
                eventItem.likeCount = 0;
            }
        } catch (error) {
            eventItem.likeCount = 0;
        }
    }
}

async function loadMemberships() {
    try {
        const result = await apiGet("/ClubMember/user/" + currentUser.userId);
        myMemberships = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadReminders() {
    try {
        const result = await apiGet("/Reminder/user/" + currentUser.userId);
        myReminders = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadOrders() {
    try {
        const result = await apiGet("/Order/user/" + currentUser.userId);
        myOrders = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadClubRequests() {
    try {
        const result = await apiGet("/ClubRequest");
        const all = Array.isArray(result) ? result : [];
        myClubRequests = all.filter(function (r) { return r.requestedBy === currentUser.userId; });
    } catch (error) { console.error(error); }
}

function renderAll() {
    renderBrowseEvents();
    renderMyClubs();
    renderReminders();
    renderMyOrders();
    renderClubRequests();
}

function clubNameFor(clubId) {
    if (!clubId) return "Campus-wide";
    const club = dashboardClubs.find(function (c) { return c.clubId === clubId; });
    return club ? club.name : "Club #" + clubId;
}

function renderBrowseEvents() {
    const container = document.getElementById("tab-browse-events");
    if (!container) return;

    let html =
        '<div class="section-head">' +
            '<div><h2>Browse events</h2><div class="sub">Across every club and society.</div></div>' +
            '<div class="head-actions">' +
                '<select class="filter-select" id="eventClubFilter">' +
                    '<option value="all">All events</option>' +
                    '<option value="campus">Campus-wide only</option>' +
                '</select>' +
                '<div class="search-box">' +
                    '<input id="eventSearchInput" placeholder="Search events or clubs">' +
                '</div>' +
            '</div>' +
        '</div>';

    if (dashboardEvents.length === 0) {
        html += '<div class="empty">No upcoming events yet.</div>';
        container.innerHTML = html;
        wireStudentEventFilters();
        return;
    }

    html += '<div class="ig-feed" id="studentEventFeed"></div>';
    container.innerHTML = html;

    populateStudentClubFilter();
    renderStudentEventFeed();
    wireStudentEventFilters();
}

function populateStudentClubFilter() {
    const select = document.getElementById("eventClubFilter");
    if (!select) return;
    dashboardClubs.forEach(function (club) {
        const option = document.createElement("option");
        option.value = club.clubId;
        option.textContent = club.name;
        select.appendChild(option);
    });
}

function renderStudentEventFeed() {
    const feed = document.getElementById("studentEventFeed");
    if (!feed) return;

    const searchEl = document.getElementById("eventSearchInput");
    const filterEl = document.getElementById("eventClubFilter");
    if (!searchEl || !filterEl) return;

    const searchValue = (searchEl.value || "").toLowerCase();
    const filterValue = filterEl.value;

    let list = dashboardEvents.slice();

    if (filterValue === "campus") {
        list = list.filter(function (eventItem) { return !eventItem.clubId; });
    } else if (filterValue !== "all") {
        const cid = Number(filterValue);
        list = list.filter(function (eventItem) { return eventItem.clubId === cid; });
    }

    if (searchValue) {
        list = list.filter(function (eventItem) {
            const cn = clubNameFor(eventItem.clubId).toLowerCase();
            return eventItem.name.toLowerCase().includes(searchValue) ||
                   eventItem.venue.toLowerCase().includes(searchValue) ||
                   cn.includes(searchValue);
        });
    }

    if (list.length === 0) {
        feed.innerHTML = '<div class="empty">No events match your filters.</div>';
        return;
    }

    let html = "";
    list.forEach(function (eventItem) {
        html += eventCardHtml(eventItem);
    });
    feed.innerHTML = html;
}

function wireStudentEventFilters() {
    const search = document.getElementById("eventSearchInput");
    const select = document.getElementById("eventClubFilter");
    if (search) search.addEventListener("input", renderStudentEventFeed);
    if (select) select.addEventListener("change", renderStudentEventFeed);
}

function eventCardHtml(eventItem) {
    const clubName = clubNameFor(eventItem.clubId);
    const initial = clubName.charAt(0).toUpperCase();
    const dateText = formatDate(eventItem.eventStartAt);
    const posterUri = decodeImage(eventItem.poster);

    let posterHtml;
    if (posterUri) {
        posterHtml = '<img class="ig-post-photo" src="' + posterUri + '" alt="">';
    } else {
        posterHtml = '<div class="ig-post-photo" style="display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px;background:#2A2A2A">' + escapeHtml(eventItem.name) + '</div>';
    }

    const myReminder = myReminders.find(function (r) { return r.eventId === eventItem.eventId; });
    const bookmarkFill = myReminder ? "#0a0a0a" : "none";
    const likeCount = eventItem.likeCount || 0;
    const isLiked = eventItem.likedByMe === true;

    const linksHtml = buildLinksHtml(eventItem.links);
    const capacityHtml = eventItem.capacity
        ? '<div class="ig-detail-row"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>' + (eventItem.attendingCount || 0) + ' / ' + eventItem.capacity + ' attending</span></div>'
        : '';

    return (
        '<article class="ig-post">' +
            '<div class="ig-post-head">' +
                '<div class="ig-avatar">' + initial + '</div>' +
                '<div>' +
                    '<div class="ig-post-club">' + escapeHtml(clubName) + '</div>' +
                    '<div class="ig-post-meta">' + dateText + ' · ' + escapeHtml(eventItem.venue) + '</div>' +
                '</div>' +
            '</div>' +
            '<a href="../../pages/event-detail.html?eventId=' + eventItem.eventId + '&from=events">' +
                posterHtml +
            '</a>' +
            '<div class="ig-actions">' +
                '<div class="like-button' + (isLiked ? " liked" : "") + '" onclick="toggleEventLikeFromDashboard(' + eventItem.eventId + ', this)">' +
                    '<div class="like">' +
                        '<svg class="like-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                            '<path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"></path>' +
                        '</svg>' +
                        '<span class="like-text">Likes</span>' +
                    '</div>' +
                    '<span class="like-count one">' + likeCount + '</span>' +
                    '<span class="like-count two">' + (likeCount + 1) + '</span>' +
                '</div>' +
                '<button class="icon-action" onclick="toggleReminderFromDashboard(' + eventItem.eventId + ')" title="' + (myReminder ? 'Remove reminder' : 'Remind me') + '">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="' + bookmarkFill + '" stroke="#0a0a0a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
                    '<span>' + (myReminder ? 'Reminder set' : 'Remind me') + '</span>' +
                '</button>' +
                '<div class="share-menu-wrap">' +
                    '<button class="icon-action" onclick="toggleShareMenu(event, this)" title="Share">' +
                        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>' +
                        '<span>Share</span>' +
                    '</button>' +
                    '<div class="share-menu">' +
                        '<button class="share-menu-item" onclick="shareEvent(\'whatsapp\', ' + eventItem.eventId + ', \'' + escapeJs(eventItem.name) + '\', \'' + escapeJs(dateText) + '\', \'' + escapeJs(eventItem.venue) + '\')">' +
                            '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
                            '<span>WhatsApp</span>' +
                        '</button>' +
                        '<button class="share-menu-item" onclick="shareEvent(\'copy\', ' + eventItem.eventId + ', \'' + escapeJs(eventItem.name) + '\', \'' + escapeJs(dateText) + '\', \'' + escapeJs(eventItem.venue) + '\')">' +
                            '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
                            '<span>Copy link</span>' +
                        '</button>' +
                        '<button class="share-menu-item" onclick="shareEvent(\'native\', ' + eventItem.eventId + ', \'' + escapeJs(eventItem.name) + '\', \'' + escapeJs(dateText) + '\', \'' + escapeJs(eventItem.venue) + '\')">' +
                            '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
                            '<span>More options</span>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="ig-caption"><b>' + escapeHtml(eventItem.name) + '</b><br>' + escapeHtml(eventItem.description) + '</div>' +
            '<div class="ig-meta">' +
                escapeHtml(eventItem.eventTime || "") + ' · ' + escapeHtml(eventItem.venue) +
                capacityHtml +
                linksHtml +
            '</div>' +
        '</article>'
    );
}

function buildLinksHtml(links) {
    if (!links) return "";
    const firstLine = links.split("\n")[0].trim();
    if (!firstLine) return "";
    return '<div class="ig-detail-row"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><a href="' + escapeHtml(firstLine) + '" target="_blank" rel="noopener">Register / more info</a></div>';
}

function escapeJs(text) {
    if (text == null) return "";
    return String(text).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

async function toggleEventLikeFromDashboard(eventId, buttonElement) {
    await toggleEventLike(eventId, buttonElement);
}

async function toggleReminderFromDashboard(eventId) {
    if (!currentUser) { openLoginModal(); return; }

    const existing = myReminders.find(function (r) { return r.eventId === eventId; });

    if (existing) {
        const result = await apiDelete("/Reminder/" + existing.reminderId);
        if (!result.ok) { showToast("Could not remove reminder", "error"); return; }
        showToast("Reminder removed", "success");
    } else {
        const body = { eventId: eventId, userId: currentUser.userId, message: null };
        const result = await apiPost("/Reminder", body);
        if (!result.ok) {
            showToast((result.data && result.data.message) ? result.data.message : "Could not set reminder", "error");
            return;
        }
        showToast("Reminder set", "success");
    }

    await loadReminders();
    renderStudentEventFeed();
    renderReminders();
    loadPulseForUser(currentUser);
}

function renderMyClubs() {
    const container = document.getElementById("tab-my-clubs");
    if (!container) return;

    const approvedMemberships = myMemberships.filter(function (m) { return m.status === "Approved"; });

    if (approvedMemberships.length === 0) {
        container.innerHTML =
            '<div class="section-head"><div><h2>My clubs &amp; societies</h2><div class="sub">Everything happening in the clubs you belong to.</div></div></div>' +
            '<div class="empty">You are not in a club yet — send a join request from the "Clubs &amp; societies" tab, and it will show up here once a board approves you.</div>';
        return;
    }

    if (approvedMemberships.length === 1) {
        selectedMyClubId = approvedMemberships[0].clubId;
    }

    if (selectedMyClubId === null || !approvedMemberships.some(function (m) { return m.clubId === selectedMyClubId; })) {
        selectedMyClubId = approvedMemberships[0].clubId;
    }

    let html =
        '<div class="section-head"><div><h2>My clubs &amp; societies</h2><div class="sub">Everything happening in the clubs you belong to.</div></div></div>';

    if (approvedMemberships.length > 1) {
        html += '<div class="club-tab-strip">';
        approvedMemberships.forEach(function (membership) {
            const club = dashboardClubs.find(function (c) { return c.clubId === membership.clubId; });
            if (!club) return;
            const activeClass = club.clubId === selectedMyClubId ? " active" : "";
            html += '<button class="club-tab' + activeClass + '" onclick="selectMyClub(' + club.clubId + ')">' + escapeHtml(club.name) + '</button>';
        });
        html += '</div>';
    }

    const activeMembership = approvedMemberships.find(function (m) { return m.clubId === selectedMyClubId; });
    const club = activeMembership ? dashboardClubs.find(function (c) { return c.clubId === activeMembership.clubId; }) : null;

    if (club) {
        html +=
            '<div class="card" style="padding:22px">' +
                '<span class="tag">' + escapeHtml(club.category) + '</span>' +
                '<h4 style="font-size:17px;margin:10px 0 4px">' + escapeHtml(club.name) + '</h4>' +
                '<p class="desc">' + escapeHtml(club.description) + '</p>' +
                '<div class="card-actions">' +
                    '<a class="btn-fill" href="../executive/dashboard.html?clubId=' + club.clubId + '&mode=member"><span class="btn-txt">Go to Club Dashboard</span></a>' +
                '</div>' +
            '</div>';
    }

    container.innerHTML = html;
}

function selectMyClub(clubId) {
    selectedMyClubId = clubId;
    renderMyClubs();
}

function renderReminders() {
    const container = document.getElementById("tab-reminders");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Reminders</h2><div class="sub">Events you have flagged to remember.</div></div></div>';

    if (myReminders.length === 0) {
        html += '<div class="empty">No reminders yet — bookmark an event to add one.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Event</th><th>Remind at</th><th>Expires at</th><th></th></tr>';

    myReminders.forEach(function (reminder) {
        const eventItem = dashboardEvents.find(function (e) { return e.eventId === reminder.eventId; });
        const eventName = eventItem ? eventItem.name : "Event #" + reminder.eventId;

        html +=
            '<tr>' +
                '<td>' + escapeHtml(eventName) + '</td>' +
                '<td>' + formatDate(reminder.remindAt) + '</td>' +
                '<td>' + formatDate(reminder.expireAt) + '</td>' +
                '<td><button class="btn ghost sm" onclick="removeReminder(' + reminder.reminderId + ')">Remove</button></td>' +
            '</tr>';
    });

    html += '</table></div>';
    container.innerHTML = html;
}

async function removeReminder(reminderId) {
    if (!confirm("Remove this reminder?")) return;
    const result = await apiDelete("/Reminder/" + reminderId);
    if (!result.ok) { showToast("Could not remove reminder", "error"); return; }
    showToast("Reminder removed", "success");
    await loadReminders();
    renderReminders();
    renderStudentEventFeed();
    loadPulseForUser(currentUser);
}

function renderMyOrders() {
    const container = document.getElementById("tab-my-orders");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>My orders</h2><div class="sub">Merch you have ordered from clubs.</div></div></div>';

    if (myOrders.length === 0) {
        html += '<div class="empty">No orders yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Order</th><th>Qty</th><th>Total</th><th>Status</th><th>Placed</th></tr>';

    myOrders.forEach(function (order) {
        html +=
            '<tr>' +
                '<td>#' + order.orderId + '</td>' +
                '<td>' + order.quantity + '</td>' +
                '<td>Rs. ' + order.totalPrice.toLocaleString() + '</td>' +
                '<td><span class="tag">' + escapeHtml(order.status) + '</span></td>' +
                '<td>' + formatDate(order.createdAt) + '</td>' +
            '</tr>';
    });

    html += '</table></div>';
    container.innerHTML = html;
}

function renderClubRequests() {
    const container = document.getElementById("tab-request-club");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Request a club</h2><div class="sub">Do not see your club on campus? Propose it — the ICBT team reviews every request.</div></div>' +
        '<button class="btn-fill" onclick="openClubRequestModal()"><span class="btn-txt">+ New request</span></button></div>';

    if (myClubRequests.length === 0) {
        html += '<div class="empty">No requests yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Name</th><th>Category</th><th>Status</th></tr>';

    myClubRequests.forEach(function (request) {
        let tagClass = "warn";
        if (request.status === "Approved") tagClass = "good";
        if (request.status === "Rejected") tagClass = "bad";

        html +=
            '<tr>' +
                '<td>' + escapeHtml(request.proposedName) + '</td>' +
                '<td>' + escapeHtml(request.category) + '</td>' +
                '<td><span class="tag ' + tagClass + '">' + escapeHtml(request.status) + '</span></td>' +
            '</tr>';
    });

    html += '</table></div>';
    container.innerHTML = html;
}

function openClubRequestModal() {
    openModal(
        '<h3>Propose a new club</h3>' +
        '<div class="field"><label>Club name</label><input id="crName" maxlength="100"></div>' +
        '<div class="field"><label>Category</label><input id="crCategory" maxlength="50" placeholder="e.g. Sports"></div>' +
        '<div class="field"><label>Description</label><textarea id="crDescription" maxlength="2000"></textarea></div>' +
        '<div class="field"><label>Purpose</label><textarea id="crPurpose" maxlength="1000"></textarea></div>' +
        '<div class="field"><label>Expected members (optional)</label><input id="crExpected" type="number"></div>' +
        '<div class="field">' +
            '<label>Cover letter (optional — PDF or DOC)</label>' +
            buildDropZone("crCoverLetterInput", ".pdf,.doc,.docx") +
            '<div id="crCoverLetterLabel" style="font-size:12px;color:var(--ink-soft);margin-top:6px"></div>' +
        '</div>' +
        '<button class="btn full" onclick="submitClubRequest()">Submit request</button>'
    );

    selectedCoverLetterBytes = null;
    document.getElementById("crCoverLetterInput").addEventListener("change", handleCoverLetterSelect);
}

function handleCoverLetterSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        selectedCoverLetterBytes = e.target.result.split(",")[1];
        document.getElementById("crCoverLetterLabel").textContent = "✓ " + file.name;
    };
    reader.readAsDataURL(file);
}

async function submitClubRequest() {
    const name = document.getElementById("crName").value.trim();
    const category = document.getElementById("crCategory").value.trim();
    const description = document.getElementById("crDescription").value.trim();
    const purpose = document.getElementById("crPurpose").value.trim();
    const expected = document.getElementById("crExpected").value;

    if (!name || !category || !description || !purpose) {
        showToast("Fill in all required fields", "error");
        return;
    }

    if (!confirm("Confirm request new club?")) return;

    const body = {
        requestedBy: currentUser.userId,
        proposedName: name,
        category: category,
        description: description,
        purpose: purpose,
        expectedMembers: expected ? Number(expected) : null,
        coverLetter: selectedCoverLetterBytes || ""
    };

    const result = await apiPost("/ClubRequest", body);

    if (!result.ok) {
        showToast("Could not submit request", "error");
        return;
    }

    closeModal();
    showToast("Request sent to the ICBT team", "success");
    selectedCoverLetterBytes = null;
    await loadClubRequests();
    renderClubRequests();
}