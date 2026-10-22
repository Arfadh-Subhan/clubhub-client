let allEvents = [];
let allClubs = [];
let currentUser = null;
let myReminders = [];

document.addEventListener("DOMContentLoaded", async function () {
    currentUser = getCurrentUser();
    bootstrapPage("browse-events");
    await loadPage();
});

// -- Load page

async function loadPage() {
    await loadClubs();
    await loadEvents();
    await loadMyActions();
    wireFilters();
    loadPulseForUser(currentUser);
}

// -- Load clubs for the filter dropdown

async function loadClubs() {
    try {
        const result = await apiGet("/Club?pageNumber=1&pageSize=100");
        allClubs = (result && result.items) ? result.items : [];
        const select = document.getElementById("clubFilter");
        if (!select) return;
        allClubs.forEach(function (club) {
            const option = document.createElement("option");
            option.value = club.clubId;
            option.textContent = club.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error(error);
    }
}

// -- Load events

async function loadEvents() {
    const container = document.getElementById("eventFeed");
    if (!container) return;

    renderFeedSkeletons(container, 2);

    try {
        const result = await apiGet("/Event?pageNumber=1&pageSize=50");
        allEvents = (result && result.items) ? result.items : [];
        await loadLikeCounts();
        renderFeed();
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="empty">Could not load events.</div>';
    }
}

// -- Load like counts for each event

async function loadLikeCounts() {
    for (const eventItem of allEvents) {
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

// -- Load my reminders

async function loadMyActions() {
    if (!currentUser) return;

    try {
        const reminderResult = await apiGet("/Reminder/user/" + currentUser.userId);
        myReminders = Array.isArray(reminderResult) ? reminderResult : [];
    } catch (error) { myReminders = []; }
}

// -- Render feed

function renderFeed() {
    const container = document.getElementById("eventFeed");
    if (!container) return;

    const searchValue = (document.getElementById("eventSearch").value || "").toLowerCase();
    const filterValue = document.getElementById("clubFilter").value;

    let list = allEvents.slice();

    if (filterValue === "campus") {
        list = list.filter(function (eventItem) { return !eventItem.clubId; });
    } else if (filterValue !== "all") {
        const clubId = Number(filterValue);
        list = list.filter(function (eventItem) { return eventItem.clubId === clubId; });
    }

    if (searchValue) {
        list = list.filter(function (eventItem) {
            const clubName = clubNameFor(eventItem.clubId).toLowerCase();
            return eventItem.name.toLowerCase().includes(searchValue) ||
                   eventItem.venue.toLowerCase().includes(searchValue) ||
                   clubName.includes(searchValue);
        });
    }

    if (list.length === 0) {
        container.innerHTML = '<div class="empty">No events match your filters.</div>';
        return;
    }

    let html = "";
    list.forEach(function (eventItem) {
        html += eventCardHtml(eventItem);
    });
    container.innerHTML = html;
}

// -- Filter wiring

function wireFilters() {
    const search = document.getElementById("eventSearch");
    const select = document.getElementById("clubFilter");
    if (search) search.addEventListener("input", renderFeed);
    if (select) select.addEventListener("change", renderFeed);
}

// -- Helpers

function clubNameFor(clubId) {
    if (!clubId) return "Campus-wide";
    const club = allClubs.find(function (c) { return c.clubId === clubId; });
    return club ? club.name : "Club #" + clubId;
}

function eventCardHtml(eventItem) {
    const clubName = clubNameFor(eventItem.clubId);
    const initial = clubName.charAt(0).toUpperCase();
    const dateText = formatDate(eventItem.eventStartAt);
    const posterUri = decodeImage(eventItem.poster);

    let posterHtml;
    if (posterUri) {
        posterHtml = '<img class="ig-post-photo" src="' + posterUri + '" alt="' + escapeHtml(eventItem.name) + '">';
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
            '<a href="event-detail.html?eventId=' + eventItem.eventId + '&from=events">' +
                posterHtml +
            '</a>' +
            '<div class="ig-actions">' +
                '<div class="like-button' + (isLiked ? " liked" : "") + '" onclick="toggleEventLikeFromCard(event, ' + eventItem.eventId + ', this)">' +
                    '<div class="like">' +
                        '<svg class="like-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                            '<path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"></path>' +
                        '</svg>' +
                        '<span class="like-text">Likes</span>' +
                    '</div>' +
                    '<span class="like-count one">' + likeCount + '</span>' +
                    '<span class="like-count two">' + (likeCount + 1) + '</span>' +
                '</div>' +
                '<button class="icon-action" onclick="toggleReminder(' + eventItem.eventId + ')" title="' + (myReminder ? 'Remove reminder' : 'Remind me') + '">' +
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

// -- Like toggle

async function toggleEventLikeFromCard(event, eventId, buttonElement) {
    await toggleEventLike(eventId, buttonElement);
}

// -- Reminder toggle

async function toggleReminder(eventId) {
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

    await loadMyActions();
    renderFeed();
    loadPulseForUser(currentUser);
}