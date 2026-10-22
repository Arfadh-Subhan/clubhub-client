let currentUser = null;
let eventItem = null;
let clubName = "Campus-wide";
let myReminder = null;
let eventLikeCount = 0;
let isAdminView = false;

document.addEventListener("DOMContentLoaded", async function () {
    currentUser = getCurrentUser();
    bootstrapPage("");

    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("eventId");
    
    // Check if ICBT Admin is reviewing this
    const from = params.get("from");
    if (from === "admin") {
        isAdminView = true;
    }

    if (!eventId) {
        document.getElementById("eventDetail").innerHTML =
            '<div class="empty">No event selected.</div>';
        return;
    }

    await loadEvent(eventId);
});

async function loadEvent(eventId) {
    const container = document.getElementById("eventDetail");

    try {
        eventItem = await apiGet("/Event/" + eventId);

        if (!eventItem) {
            container.innerHTML = '<div class="empty">Event not found.</div>';
            return;
        }

        if (eventItem.clubId) {
            try {
                const club = await apiGet("/Club/" + eventItem.clubId);
                if (club) clubName = club.name;
            } catch (error) { console.error(error); }
        }

        await loadLikeCount();

        if (currentUser && !isAdminView) {
            await loadMyReminder();
        }

        render();
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="empty">Could not load event.</div>';
    }
}

async function loadLikeCount() {
    try {
        const result = await apiGet("/Like/event/" + eventItem.eventId);
        if (result && typeof result.likeCount === "number") {
            eventLikeCount = result.likeCount;
        } else {
            eventLikeCount = 0;
        }
    } catch (error) {
        eventLikeCount = 0;
    }
}

async function loadMyReminder() {
    try {
        const list = await apiGet("/Reminder/user/" + currentUser.userId);
        if (Array.isArray(list)) {
            myReminder = list.find(function (reminder) { return reminder.eventId === eventItem.eventId; }) || null;
        }
    } catch (error) { console.error(error); }
}

function render() {
    const container = document.getElementById("eventDetail");
    const initial = clubName.charAt(0).toUpperCase();
    const posterUri = decodeImage(eventItem.poster);

    let posterHtml = "";
    if (posterUri) {
        posterHtml = '<img src="' + posterUri + '" class="ig-post-photo" style="border-radius:14px;margin-bottom:24px" alt="">';
    } else {
        posterHtml = '<div style="width:100%;aspect-ratio:16/9;border-radius:14px;background:#2A2A2A;color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;margin-bottom:24px">' + escapeHtml(eventItem.name) + '</div>';
    }

    const attending = eventItem.attendingCount || 0;
    const capacityLine = eventItem.capacity ? (attending + ' / ' + eventItem.capacity + ' attending') : (attending + ' attending');

    const bookmarkFill = myReminder ? "#0a0a0a" : "none";
    const isLiked = eventItem.likedByMe === true;

    let statusTag = "";
    if (eventItem.status === "Pending") statusTag = '<span class="tag warn">Pending approval</span>';
    if (eventItem.status === "Rejected") statusTag = '<span class="tag bad">Rejected</span>';
    if (eventItem.status === "Approved") statusTag = '<span class="tag good">Approved</span>';

    const linksHtml = buildDetailLinksHtml(eventItem.links);

    // Build review buttons if admin
    let adminActionsHtml = "";
    if (isAdminView && currentUser && (currentUser.role === "IcbtAdmin" || currentUser.role === "SuperAdmin")) {
        const proofUri = decodeImage(eventItem.permissionProof);
        const proofLine = proofUri 
            ? '<a class="btn ghost sm" href="' + proofUri + '" download="permission-proof">Download Permission Proof</a>' 
            : '<span style="color:var(--ink-faint);font-size:13px">No proof provided</span>';

        adminActionsHtml = 
            '<div class="card-plain" style="margin-bottom:24px; background:var(--panel-2); border:1px solid var(--line)">' +
                '<h4 style="margin-bottom:12px">Admin Review</h4>' +
                '<div style="margin-bottom:16px"><b>Permission Proof:</b> ' + proofLine + '</div>' +
                '<div class="card-actions">' +
                    (eventItem.status === "Pending" 
                        ? '<button class="btn good" onclick="adminApprove()">Approve</button>' +
                          '<button class="btn danger" onclick="adminReject()">Reject</button>'
                        : '<span class="tag ' + (eventItem.status === "Approved" ? "good" : "bad") + '">Already ' + escapeHtml(eventItem.status) + '</span>') +
                    '<a href="../../pages/icbt-admin/dashboard.html?tab=approvals" class="btn outline" style="margin-left:auto">Back to Approvals</a>' +
                '</div>' +
            '</div>';
    }

    container.innerHTML =
        posterHtml +
        '<div class="section-head">' +
            '<div>' +
                '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
                    '<div class="ig-avatar">' + initial + '</div>' +
                    '<div>' +
                        '<div class="ig-post-club">' + escapeHtml(clubName) + '</div>' +
                        '<div class="ig-post-meta">' + formatDate(eventItem.eventStartAt) + ' · ' + escapeHtml(eventItem.venue) + '</div>' +
                    '</div>' +
                '</div>' +
                '<h2>' + escapeHtml(eventItem.name) + '</h2>' +
                statusTag +
            '</div>' +
        '</div>' +

        adminActionsHtml +

        '<div class="card-plain" style="margin-bottom:24px">' +
            '<p style="font-size:15px;line-height:1.65;color:var(--ink-soft)">' + escapeHtml(eventItem.description) + '</p>' +
        '</div>' +

        '<div class="grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:24px">' +
            '<div class="card"><div class="meta">Date</div><div style="font-weight:600">' + formatDate(eventItem.eventStartAt) + '</div></div>' +
            '<div class="card"><div class="meta">Time</div><div style="font-weight:600">' + escapeHtml(eventItem.eventTime || "—") + '</div></div>' +
            '<div class="card"><div class="meta">Venue</div><div style="font-weight:600">' + escapeHtml(eventItem.venue) + '</div></div>' +
        '</div>' +

        linksHtml +

        '<div class="card-plain" style="margin-bottom:24px">' +
            '<div style="font-size:14px;color:var(--ink-soft);margin-bottom:16px">' + capacityLine + '</div>' +
            '<div class="card-actions">' +
                '<div class="like-button' + (isLiked ? " liked" : "") + '" onclick="toggleEventLikeFromDetail(this)">' +
                    '<div class="like">' +
                        '<svg class="like-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                            '<path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"></path>' +
                        '</svg>' +
                        '<span class="like-text">Likes</span>' +
                    '</div>' +
                    '<span class="like-count one">' + eventLikeCount + '</span>' +
                    '<span class="like-count two">' + (eventLikeCount + 1) + '</span>' +
                '</div>' +
                '<button class="icon-action" onclick="toggleReminder()" title="' + (myReminder ? 'Remove reminder' : 'Remind me') + '">' +
                    '<svg width="22" height="22" viewBox="0 0 24 24" fill="' + bookmarkFill + '" stroke="#0a0a0a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
                    '<span>' + (myReminder ? 'Reminder set' : 'Remind me') + '</span>' +
                '</button>' +
                '<div class="share-menu-wrap">' +
                    '<button class="icon-action" onclick="toggleShareMenu(event, this)" title="Share">' +
                        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>' +
                        '<span>Share</span>' +
                    '</button>' +
                    '<div class="share-menu">' +
                        '<button class="share-menu-item" onclick="shareEvent(\'whatsapp\', ' + eventItem.eventId + ', \'' + escapeJs(eventItem.name) + '\', \'' + escapeJs(formatDate(eventItem.eventStartAt)) + '\', \'' + escapeJs(eventItem.venue) + '\')">' +
                            '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
                            '<span>WhatsApp</span>' +
                        '</button>' +
                        '<button class="share-menu-item" onclick="shareEvent(\'copy\', ' + eventItem.eventId + ', \'' + escapeJs(eventItem.name) + '\', \'' + escapeJs(formatDate(eventItem.eventStartAt)) + '\', \'' + escapeJs(eventItem.venue) + '\')">' +
                            '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
                            '<span>Copy link</span>' +
                        '</button>' +
                        '<button class="share-menu-item" onclick="shareEvent(\'native\', ' + eventItem.eventId + ', \'' + escapeJs(eventItem.name) + '\', \'' + escapeJs(formatDate(eventItem.eventStartAt)) + '\', \'' + escapeJs(eventItem.venue) + '\')">' +
                            '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
                            '<span>More options</span>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
}

function buildDetailLinksHtml(links) {
    if (!links) return "";
    const lines = links.split("\n").map(function (line) { return line.trim(); }).filter(function (line) { return line.length > 0; });
    if (lines.length === 0) return "";

    let inner = '<div class="card-plain" style="margin-bottom:24px"><div class="meta" style="margin-bottom:10px">Registration links</div>';
    lines.forEach(function (line) {
        inner += '<div class="ig-detail-row"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><a href="' + escapeHtml(line) + '" target="_blank" rel="noopener">' + escapeHtml(line) + '</a></div>';
    });
    inner += '</div>';
    return inner;
}

function escapeJs(text) {
    if (text == null) return "";
    return String(text).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

async function toggleEventLikeFromDetail(buttonElement) {
    await toggleEventLike(eventItem.eventId, buttonElement);
}

async function toggleReminder() {
    if (!currentUser) {
        openLoginModal();
        return;
    }

    if (myReminder) {
        const result = await apiDelete("/Reminder/" + myReminder.reminderId);
        if (!result.ok) { showToast("Could not remove reminder", "error"); return; }
        showToast("Reminder removed", "success");
        myReminder = null;
    } else {
        const body = { eventId: eventItem.eventId, userId: currentUser.userId, message: null };
        const result = await apiPost("/Reminder", body);
        if (!result.ok) {
            showToast((result.data && result.data.message) ? result.data.message : "Could not set reminder", "error");
            return;
        }
        showToast("Reminder set", "success");
        myReminder = result.data.reminder || { eventId: eventItem.eventId };
    }

    await loadEvent(eventItem.eventId);
}

async function adminApprove() {
    if (!confirm("Approve this event?")) return;
    
    const result = await apiPut("/Event/" + eventItem.eventId + "/approve", { reviewedBy: currentUser.userId });
    if (!result.ok) { showToast("Could not approve", "error"); return; }
    showToast("Event approved successfully", "success");
    
    setTimeout(function() {
        window.location.href = "icbt-admin/dashboard.html?tab=approvals";
    }, 1000);
}

async function adminReject() {
    const reason = prompt("Rejection reason:");
    if (reason === null) return;
    if (!confirm("Reject this event?")) return;

    const result = await apiPut("/Event/" + eventItem.eventId + "/reject", { 
        reviewedBy: currentUser.userId, 
        rejectionReason: reason || "No reason provided." 
    });
    
    if (!result.ok) { showToast("Could not reject", "error"); return; }
    showToast("Event rejected", "success");
    
    setTimeout(function() {
        window.location.href = "icbt-admin/dashboard.html?tab=approvals";
    }, 1000);
}