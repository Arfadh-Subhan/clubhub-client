let currentUser = null;
let clubs = [];
let clubPresidentMap = {};
let allEvents = [];
let pendingEvents = [];
let pendingPosts = [];
let pendingAnnouncements = [];
let pendingProducts = [];
let clubRequests = [];
let usersPage = null;
let analyticsSummary = null;
let analyticsMembers = [];
let analyticsEvents = [];
let icbtUsersSearchValue = "";
let icbtUsersRoleFilter = "all";

let selectedCampusPosterBytes = null;
let selectedCampusProofBytes = null;
let selectedCampusProofName = "";

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
    return params.get("tab") || "societies";
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
        loadClubs(),
        loadAllEvents(),
        loadPendingEvents(),
        loadPendingPosts(),
        loadPendingAnnouncements(),
        loadPendingProducts(),
        loadClubRequests(),
        loadUsers(),
        loadAnalytics()
    ]);
    await loadClubPresidents();
    renderAll();
}

async function loadClubs() {
    try {
        const result = await apiGet("/Club?pageNumber=1&pageSize=100");
        clubs = (result && result.items) ? result.items : [];
    } catch (error) { console.error(error); }
}

async function loadClubPresidents() {
    clubPresidentMap = {};
    for (const club of clubs) {
        try {
            const members = await apiGet("/ClubMember/club/" + club.clubId);
            if (Array.isArray(members)) {
                const president = members.find(function (member) {
                    return member.clubRole === "Executive" && member.position === "President";
                });
                clubPresidentMap[club.clubId] = president ? president.userId : null;
            } else {
                clubPresidentMap[club.clubId] = null;
            }
        } catch (error) {
            clubPresidentMap[club.clubId] = null;
        }
    }
}

async function loadAllEvents() {
    try {
        const result = await apiGet("/Event?pageNumber=1&pageSize=100");
        allEvents = (result && result.items) ? result.items : [];
    } catch (error) { console.error(error); }
}

async function loadPendingEvents() {
    try {
        const result = await apiGet("/Event/pending");
        pendingEvents = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadPendingPosts() {
    try {
        const result = await apiGet("/ClubPost/pending");
        pendingPosts = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadPendingAnnouncements() {
    try {
        const result = await apiGet("/ClubAnnouncement/pending");
        pendingAnnouncements = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadPendingProducts() {
    try {
        const result = await apiGet("/ClubProduct/pending");
        pendingProducts = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadClubRequests() {
    try {
        const result = await apiGet("/ClubRequest/pending");
        clubRequests = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadUsers() {
    try {
        usersPage = await apiGet("/IcbtAdmin/users?pageNumber=1&pageSize=100");
    } catch (error) { console.error(error); }
}

async function loadAnalytics() {
    try {
        const summary = await apiGet("/Analytics/summary");
        analyticsSummary = summary || { activeClubs: 0, liveEvents: 0, pendingReviews: 0, totalEnrollments: 0 };
        
        const members = await apiGet("/Analytics/members-by-club");
        analyticsMembers = Array.isArray(members) ? members : [];
        
        const events = await apiGet("/Analytics/events-by-club");
        analyticsEvents = Array.isArray(events) ? events : [];
    } catch (error) {
        console.error("Failed to load analytics:", error);
        analyticsSummary = { activeClubs: 0, liveEvents: 0, pendingReviews: 0, totalEnrollments: 0 };
        analyticsMembers = [];
        analyticsEvents = [];
    }
}

function renderAll() {
    renderSocieties();
    renderCampusEvents();
    renderApprovals();
    renderClubRequests();
    renderUsers();
    renderAddExecutive();
    renderAnalytics();
}

function renderSocieties() {
    const container = document.getElementById("tab-societies");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Societies</h2><div class="sub">All clubs and societies on campus.</div></div></div>';

    if (clubs.length === 0) {
        html += '<div class="empty">No societies yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="grid" id="clubGrid">';
    clubs.forEach(function (club) {
        const logoUri = decodeImage(club.logo);
        const logoBlock = logoUri
            ? '<img src="' + logoUri + '" alt="' + escapeHtml(club.name) + '">'
            : '<div class="initial">' + escapeHtml(club.name.charAt(0).toUpperCase()) + '</div>';

        const presidentId = clubPresidentMap[club.clubId];
        const presidentTag = presidentId
            ? '<span class="tag good" style="left:auto;right:12px">President set</span>'
            : '<span class="tag bad" style="left:auto;right:12px">No president yet</span>';

        const manageUrl = '../../pages/club-manage.html?clubId=' + club.clubId;

        html +=
            '<div class="club-card-u" onclick="window.location.href=\'' + manageUrl + '\'">' +
                '<span class="tag">' + escapeHtml(club.category) + '</span>' +
                presidentTag +
                '<div class="wrapper">' +
                    '<div class="card-image">' + logoBlock + '</div>' +
                    '<div class="content">' +
                        '<p class="title">' + escapeHtml(club.name) + '</p>' +
                        '<p class="sub">' + escapeHtml(club.description) + '</p>' +
                    '</div>' +
                    '<button class="card-btn" onclick="event.stopPropagation(); window.location.href=\'' + manageUrl + '\'">Manage club</button>' +
                '</div>' +
            '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderCampusEvents() {
    const container = document.getElementById("tab-campus-events");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Campus events</h2><div class="sub">Create campus-wide events that go live immediately.</div></div>' +
        '<button class="btn-fill" onclick="openCampusEventModal()"><span class="btn-txt">+ New campus event</span></button></div>';

    const approved = allEvents.filter(function (e) { return e.status === "Approved"; });

    if (approved.length === 0) {
        html += '<div class="empty">No approved events yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="grid">';
    approved.forEach(function (eventItem) {
        const posterUri = decodeImage(eventItem.poster);
        const logoBlock = posterUri
            ? '<img src="' + posterUri + '" alt="' + escapeHtml(eventItem.name) + '">'
            : '<div class="initial">' + escapeHtml(eventItem.name.charAt(0).toUpperCase()) + '</div>';

        const eventDate = formatDate(eventItem.eventStartAt) + ' · ' + escapeHtml(eventItem.venue);
        const clubName = eventItem.clubId
            ? ((clubs.find(function (c) { return c.clubId === eventItem.clubId; }) || {}).name || "Club #" + eventItem.clubId)
            : "Campus-wide";

        const detailUrl = '../../pages/event-detail.html?eventId=' + eventItem.eventId;

        html +=
            '<div class="club-card-u" onclick="window.location.href=\'' + detailUrl + '\'">' +
                '<span class="tag" style="left:12px;top:12px">Event</span>' +
                '<span class="tag good" style="left:auto;right:12px;top:12px">Approved</span>' +
                '<div class="wrapper">' +
                    '<div class="card-image">' + logoBlock + '</div>' +
                    '<div class="content">' +
                        '<p class="title">' + escapeHtml(eventItem.name) + '</p>' +
                        '<p class="sub">' + eventDate + '</p>' +
                        '<p class="sub" style="font-size:11.5px;color:var(--ink-faint);margin-top:4px">' + escapeHtml(clubName) + '</p>' +
                    '</div>' +
                    '<button class="card-btn" onclick="event.stopPropagation(); window.location.href=\'' + detailUrl + '\'">View event</button>' +
                '</div>' +
            '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
}

function openCampusEventModal() {
    selectedCampusPosterBytes = null;
    selectedCampusProofBytes = null;
    selectedCampusProofName = "";

    openModal(
        '<h3>New campus-wide event</h3>' +
        '<div class="field"><label>Event name</label><input id="ceName" maxlength="200"></div>' +
        '<div class="form-row">' +
            '<div class="field"><label>Date</label><input id="ceDate" type="date"></div>' +
            '<div class="field"><label>Time</label><input id="ceTime" placeholder="e.g. 3:00 PM" maxlength="20"></div>' +
        '</div>' +
        '<div class="field"><label>Venue</label><input id="ceVenue" maxlength="200"></div>' +
        '<div class="field"><label>Description</label><textarea id="ceDescription" maxlength="2000"></textarea></div>' +
        '<div class="field">' +
            '<label>Poster image (optional)</label>' +
            '<div style="font-size:12px;color:var(--ink-faint);margin-bottom:6px">Recommended: 720 × 540 px (4:3 ratio). Other sizes will be cropped to fit.</div>' +
            '<img id="cePosterPreview" class="photo-preview">' +
            buildDropZone("cePosterInput", "image/*") +
        '</div>' +
        '<div class="field"><label>Registration links (optional — one per line)</label><textarea id="ceLinks" maxlength="1000" placeholder="https://..."></textarea></div>' +
        '<div class="form-row">' +
            '<div class="field"><label>Capacity (optional)</label><input id="ceCapacity" type="number"></div>' +
            '<div class="field"><label>Estimated budget (optional)</label><input id="ceBudget" type="number" step="0.01"></div>' +
        '</div>' +
        '<div class="field">' +
            '<label>Permission proof (optional — PDF or image)</label>' +
            buildDropZone("ceProofInput", "image/*,.pdf") +
        '</div>' +
        '<div id="ceMessage" class="alert hidden"></div>' +
        '<button class="btn full" onclick="submitCampusEvent()">Publish</button>'
    );

    bindIcbtFileInput("cePosterInput", async function (base64, name, dataUri) {
        const input = document.getElementById("cePosterInput");
        const file = input.files[0];
        if (!file) return;

        const cropped = await openCropper(file, 4 / 3, 1440, 1080);
        if (!cropped) return;

        selectedCampusPosterBytes = cropped.split(",")[1];
        const preview = document.getElementById("cePosterPreview");
        preview.src = cropped;
        preview.style.display = "block";
    });

    bindIcbtFileInput("ceProofInput", function (base64, name) {
        selectedCampusProofBytes = base64;
        selectedCampusProofName = name;
        const dropZoneTitle = document.querySelector('label[for="ceProofInput"] .drop-zone-title');
        if(dropZoneTitle) dropZoneTitle.textContent = "✓ " + name;
    });
}

function bindIcbtFileInput(inputId, onLoaded) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            onLoaded(e.target.result.split(",")[1], file.name, e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

function openCropper(file, aspectRatio, maxWidth, maxHeight) {
    return new Promise(function (resolve) {
        const objectUrl = URL.createObjectURL(file);

        const wrap = document.createElement("div");
        wrap.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
        wrap.innerHTML =
            '<div style="background:#fff;border-radius:12px;max-width:720px;width:100%;padding:20px;display:flex;flex-direction:column;gap:14px">' +
                '<div style="display:flex;align-items:center;justify-content:space-between">' +
                    '<div style="font-weight:700;font-size:16px;color:var(--ink)">Crop image</div>' +
                    '<button type="button" data-action="cancel" style="background:none;border:none;font-size:22px;line-height:1;cursor:pointer;color:var(--ink-soft)">&times;</button>' +
                '</div>' +
                '<div style="max-height:60vh;background:#0a0a0a;border-radius:8px;overflow:hidden">' +
                    '<img data-role="target" src="' + objectUrl + '" style="max-width:100%;display:block">' +
                '</div>' +
                '<div style="display:flex;gap:10px;justify-content:flex-end">' +
                    '<button type="button" class="btn outline sm" data-action="cancel">Cancel</button>' +
                    '<button type="button" class="btn sm" data-action="confirm">Use image</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(wrap);

        const image = wrap.querySelector('[data-role="target"]');

        const cropper = new Cropper(image, {
            aspectRatio: aspectRatio,
            viewMode: 1,
            autoCropArea: 1,
            background: false,
            movable: true,
            zoomable: true,
            rotatable: false,
            scalable: false
        });

        function cleanup() {
            cropper.destroy();
            URL.revokeObjectURL(objectUrl);
            wrap.remove();
        }

        wrap.addEventListener("click", function (e) {
            const action = e.target.closest("[data-action]");
            if (!action) return;

            if (action.getAttribute("data-action") === "cancel") {
                cleanup();
                resolve(null);
                return;
            }

            if (action.getAttribute("data-action") === "confirm") {
                const canvas = cropper.getCroppedCanvas({
                    maxWidth: maxWidth,
                    maxHeight: maxHeight,
                    imageSmoothingQuality: "high"
                });

                if (!canvas) {
                    cleanup();
                    resolve(null);
                    return;
                }

                const dataUri = canvas.toDataURL("image/jpeg", 0.88);
                cleanup();
                resolve(dataUri);
            }
        });
    });
}

async function submitCampusEvent() {
    const name = document.getElementById("ceName").value.trim();
    const date = document.getElementById("ceDate").value;
    const time = document.getElementById("ceTime").value.trim();
    const venue = document.getElementById("ceVenue").value.trim();
    const description = document.getElementById("ceDescription").value.trim();
    const links = document.getElementById("ceLinks").value.trim();
    const capacity = document.getElementById("ceCapacity").value;
    const budget = document.getElementById("ceBudget").value;
    const message = document.getElementById("ceMessage");
    message.className = "alert hidden";
    message.textContent = "";

    if (!name || !date || !time || !venue || !description) {
        showModalError(message, "Fill in all required fields.");
        return;
    }

    if (!confirm("Confirm publish campus event?")) return;

    const body = {
        clubId: null,
        name: name,
        description: description,
        eventDate: date,
        eventTime: time,
        venue: venue,
        poster: selectedCampusPosterBytes || null,
        links: links || null,
        capacity: capacity ? Number(capacity) : null,
        estimatedBudget: budget ? Number(budget) : null,
        permissionProof: selectedCampusProofBytes || null,
        createdBy: currentUser.userId
    };

    const result = await apiPost("/Event", body);

    if (!result.ok) {
        if (result.data && result.data.errors) {
            showModalError(message, getFirstValidationError(result.data.errors));
            return;
        }
        showModalError(message, "Could not publish.");
        return;
    }

    if (result.data && result.data.eventId) {
        await apiPut("/Event/" + result.data.eventId + "/approve", { reviewedBy: currentUser.userId });
    }

    closeModal();
    showToast("Campus event published", "success");
    await loadAllEvents();
    renderCampusEvents();
}

function renderApprovals() {
    const container = document.getElementById("tab-approvals");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Pending approvals</h2><div class="sub">Review club-submitted content.</div></div></div>';

    if (pendingEvents.length === 0 && pendingPosts.length === 0 && pendingAnnouncements.length === 0 && pendingProducts.length === 0) {
        html += '<div class="empty">Nothing waiting on you.</div>';
        container.innerHTML = html;
        return;
    }

    if (pendingEvents.length > 0) {
        html += '<h3 style="margin-bottom:10px">Events</h3><div class="grid">';
        pendingEvents.forEach(function (e) {
            const detailUrl = '../../pages/event-detail.html?eventId=' + e.eventId + '&from=admin';
            const posterUri = decodeImage(e.poster);
            const logoBlock = posterUri
                ? '<img src="' + posterUri + '" alt="' + escapeHtml(e.name) + '">'
                : '<div class="initial">' + escapeHtml(e.name.charAt(0).toUpperCase()) + '</div>';

            html += 
                '<div class="club-card-u" onclick="window.location.href=\'' + detailUrl + '\'">' +
                    '<span class="tag warn" style="left:12px;top:12px">Event Pending</span>' +
                    '<div class="wrapper">' +
                        '<div class="card-image">' + logoBlock + '</div>' +
                        '<div class="content">' +
                            '<p class="title">' + escapeHtml(e.name) + '</p>' +
                            '<p class="sub">' + formatDate(e.eventStartAt) + ' · ' + escapeHtml(e.venue) + '</p>' +
                        '</div>' +
                        '<button class="card-btn" onclick="event.stopPropagation(); window.location.href=\'' + detailUrl + '\'">Review event</button>' +
                    '</div>' +
                '</div>';
        });
        html += '</div>';
    }

    if (pendingPosts.length > 0) {
        html += '<h3 style="margin:20px 0 10px">Posts</h3><div class="grid">';
        pendingPosts.forEach(function (p) {
            const detailUrl = '../../pages/post-detail.html?postId=' + p.clubPostId + '&from=admin';
            const coverUri = decodeImage(p.coverImage);
            const logoBlock = coverUri
                ? '<img src="' + coverUri + '" alt="' + escapeHtml(p.title) + '">'
                : '<div class="initial">' + escapeHtml(p.title.charAt(0).toUpperCase()) + '</div>';

            html += 
                '<div class="club-card-u" onclick="window.location.href=\'' + detailUrl + '\'">' +
                    '<span class="tag warn" style="left:12px;top:12px">Post Pending</span>' +
                    '<div class="wrapper">' +
                        '<div class="card-image">' + logoBlock + '</div>' +
                        '<div class="content">' +
                            '<p class="title">' + escapeHtml(p.title) + '</p>' +
                            '<p class="sub">' + escapeHtml(p.category || '') + '</p>' +
                        '</div>' +
                        '<button class="card-btn" onclick="event.stopPropagation(); window.location.href=\'' + detailUrl + '\'">Review post</button>' +
                    '</div>' +
                '</div>';
        });
        html += '</div>';
    }

    if (pendingAnnouncements.length > 0) {
        html += '<h3 style="margin:20px 0 10px">Announcements</h3><div class="grid">';
        pendingAnnouncements.forEach(function (a) {
            html += approvalCard("Announcement", a.title, a.description, a.clubAnnouncementId, "openPendingAnnouncementModal");
        });
        html += '</div>';
    }

    if (pendingProducts.length > 0) {
        html += '<h3 style="margin:20px 0 10px">Products</h3><div class="grid">';
        pendingProducts.forEach(function (p) {
            html += productApprovalCard(p);
        });
        html += '</div>';
    }

    container.innerHTML = html;
}

function approvalCard(kind, title, description, id, openFn) {
    return '<article class="card">' +
        '<span class="tag warn">' + kind + ' pending</span>' +
        '<h4 style="margin-top:10px">' + escapeHtml(title) + '</h4>' +
        '<p class="desc">' + escapeHtml(description) + '</p>' +
        '<div class="card-actions">' +
            '<button class="btn-fill" onclick="' + openFn + '(' + id + ')"><span class="btn-txt">View</span></button>' +
        '</div>' +
    '</article>';
}

function productApprovalCard(product) {
    const imgUri = decodeImage(product.image);
    const logoBlock = imgUri
        ? '<img src="' + imgUri + '" alt="' + escapeHtml(product.name) + '">'
        : '<div class="initial">' + escapeHtml(product.name.charAt(0).toUpperCase()) + '</div>';

    const detailUrl = '../../pages/product-detail.html?productId=' + product.clubProductId + '&from=admin';

    return '<div class="club-card-u" onclick="window.location.href=\'' + detailUrl + '\'">' +
        '<span class="tag" style="left:12px;top:12px">' + escapeHtml(product.category || "Product") + '</span>' +
        '<span class="tag warn" style="left:auto;right:12px;top:12px">Pending</span>' +
        '<div class="wrapper">' +
            '<div class="card-image">' + logoBlock + '</div>' +
            '<div class="content">' +
                '<p class="title">' + escapeHtml(product.name) + '</p>' +
                '<p class="sub">Rs. ' + Number(product.price).toLocaleString() + ' · Stock ' + product.stock + '</p>' +
            '</div>' +
            '<button class="card-btn" onclick="event.stopPropagation(); window.location.href=\'' + detailUrl + '\'">Review product</button>' +
        '</div>' +
    '</div>';
}

function openPendingAnnouncementModal(announcementId) {
    const a = pendingAnnouncements.find(function (x) { return x.clubAnnouncementId === announcementId; });
    if (!a) return;

    openModal(
        '<h3>' + escapeHtml(a.title) + '</h3>' +
        '<div class="meta" style="margin-bottom:16px">Club ID ' + a.clubId + '</div>' +
        '<p style="font-size:14px;color:var(--ink-soft);line-height:1.6;margin-bottom:16px">' + escapeHtml(a.description) + '</p>' +
        '<div style="font-size:13px;color:var(--ink-soft);margin-bottom:16px"><b>Links:</b> ' + (a.links ? escapeHtml(a.links) : '—') + '</div>' +
        '<div class="card-actions">' +
            '<button class="btn good sm" onclick="approveAnnouncement(' + a.clubAnnouncementId + ')">Approve</button>' +
            '<button class="btn danger sm" onclick="rejectAnnouncement(' + a.clubAnnouncementId + ')">Reject</button>' +
            '<button class="btn ghost sm" onclick="closeModal()">Close</button>' +
        '</div>'
    );
}

async function approveAnnouncement(id) {
    if (!confirm("Approve this announcement?")) return;

    const result = await apiPut("/ClubAnnouncement/" + id + "/approve", { reviewedBy: currentUser.userId });
    if (!result.ok) { showToast("Could not approve", "error"); return; }
    showToast("Announcement approved", "success");
    closeModal();
    await loadPendingAnnouncements();
    renderApprovals();
}

async function rejectAnnouncement(id) {
    const reason = prompt("Rejection reason:");
    if (reason === null) return;

    if (!confirm("Reject this announcement?")) return;

    const result = await apiPut("/ClubAnnouncement/" + id + "/reject", { reviewedBy: currentUser.userId, rejectionReason: reason || "No reason provided." });
    if (!result.ok) { showToast("Could not reject", "error"); return; }
    showToast("Announcement rejected", "success");
    closeModal();
    await loadPendingAnnouncements();
    renderApprovals();
}

function renderClubRequests() {
    const container = document.getElementById("tab-club-requests");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Club requests</h2><div class="sub">Review submitted club proposals.</div></div></div>';

    if (clubRequests.length === 0) {
        html += '<div class="empty">No pending club requests.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="grid">';
    clubRequests.forEach(function (request) {
        html +=
            '<article class="card">' +
                '<span class="tag warn">Pending</span>' +
                '<h4 style="margin-top:10px">' + escapeHtml(request.proposedName) + '</h4>' +
                '<div class="meta">' + escapeHtml(request.category) + '</div>' +
                '<p class="desc">' + escapeHtml(request.description) + '</p>' +
                '<div class="card-actions">' +
                    '<button class="btn-fill" onclick="openClubRequestModal(' + request.clubRequestId + ')"><span class="btn-txt">View</span></button>' +
                '</div>' +
            '</article>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function openClubRequestModal(clubRequestId) {
    const request = clubRequests.find(function (r) { return r.clubRequestId === clubRequestId; });
    if (!request) return;

    const coverUri = decodeImage(request.coverLetter);
    const coverLine = coverUri
        ? '<a class="btn ghost sm" href="' + coverUri + '" download="cover-letter">Download cover letter</a>'
        : '<span style="color:var(--ink-faint)">Not provided</span>';

    openModal(
        '<h3>' + escapeHtml(request.proposedName) + '</h3>' +
        '<div class="meta" style="margin-bottom:16px">' + escapeHtml(request.category) + '</div>' +
        '<p style="font-size:14px;color:var(--ink-soft);line-height:1.6;margin-bottom:14px">' + escapeHtml(request.description) + '</p>' +
        '<div style="font-size:13px;color:var(--ink-soft);line-height:1.9;margin-bottom:16px">' +
            '<div><b>Purpose:</b> ' + escapeHtml(request.purpose) + '</div>' +
            '<div><b>Expected members:</b> ' + (request.expectedMembers || '—') + '</div>' +
            '<div><b>Cover letter:</b> ' + coverLine + '</div>' +
        '</div>' +
        '<div class="card-actions">' +
            '<button class="btn good sm" onclick="approveClubRequest(' + request.clubRequestId + ')">Approve</button>' +
            '<button class="btn danger sm" onclick="rejectClubRequest(' + request.clubRequestId + ')">Reject</button>' +
            '<button class="btn ghost sm" onclick="closeModal()">Close</button>' +
        '</div>'
    );
}

async function approveClubRequest(id) {
    if (!confirm("Approve this club request?")) return;

    const result = await apiPut("/ClubRequest/" + id + "/approve", { reviewedBy: currentUser.userId });
    if (!result.ok) {
        const msg = (result.data && result.data.message) ? result.data.message : "Could not approve";
        showToast(msg, "error");
        return;
    }
    showToast("Club created — now add a President via Add Executive", "success");
    closeModal();
    await loadClubRequests();
    await loadClubs();
    await loadClubPresidents();
    renderClubRequests();
    renderSocieties();
    renderAddExecutive();
}

async function rejectClubRequest(id) {
    const reason = prompt("Rejection reason:");
    if (reason === null) return;

    if (!confirm("Reject this club request?")) return;

    const result = await apiPut("/ClubRequest/" + id + "/reject", { reviewedBy: currentUser.userId, rejectionReason: reason || "No reason provided." });
    if (!result.ok) { showToast("Could not reject", "error"); return; }
    showToast("Request rejected", "success");
    closeModal();
    await loadClubRequests();
    renderClubRequests();
}

function renderUsers() {
    const container = document.getElementById("tab-users");
    if (!container) return;

    const items = (usersPage && usersPage.items) ? usersPage.items : [];

    const filtered = items.filter(function (user) {
        const search = icbtUsersSearchValue.toLowerCase();
        const matchesSearch = !search ||
            (user.fullName || "").toLowerCase().includes(search) ||
            (user.email || "").toLowerCase().includes(search) ||
            (user.studentId || "").toLowerCase().includes(search) ||
            String(user.userId).includes(search);

        const matchesRole = icbtUsersRoleFilter === "all" || user.role === icbtUsersRoleFilter;

        return matchesSearch && matchesRole;
    });

    let html =
        '<div class="section-head"><div><h2>Manage users</h2><div class="sub">Search, suspend, activate, or delete accounts.</div></div></div>';

    html +=
        '<div class="head-actions" style="margin-bottom:16px">' +
            '<div class="search-box">' +
                '<input id="icbtUserSearch" placeholder="Search by ID, name, email..." value="' + escapeHtml(icbtUsersSearchValue) + '" oninput="onIcbtUserSearch(this.value)">' +
            '</div>' +
            '<select class="filter-select" onchange="onIcbtUserRoleFilter(this.value)">' +
                '<option value="all"' + (icbtUsersRoleFilter === "all" ? " selected" : "") + '>All roles</option>' +
                '<option value="Student"' + (icbtUsersRoleFilter === "Student" ? " selected" : "") + '>Students</option>' +
                '<option value="Executive"' + (icbtUsersRoleFilter === "Executive" ? " selected" : "") + '>Executives</option>' +
                '<option value="IcbtAdmin"' + (icbtUsersRoleFilter === "IcbtAdmin" ? " selected" : "") + '>ICBT Admins</option>' +
                '<option value="SuperAdmin"' + (icbtUsersRoleFilter === "SuperAdmin" ? " selected" : "") + '>Super Admins</option>' +
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
                '<td>' +
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

function onIcbtUserSearch(value) {
    icbtUsersSearchValue = value;
    renderUsers();
}

function onIcbtUserRoleFilter(value) {
    icbtUsersRoleFilter = value;
    renderUsers();
}

async function suspendUser(userId) {
    if (!confirm("Suspend this user?")) return;

    const result = await apiPut("/IcbtAdmin/users/" + userId + "/suspend", {});
    if (!result.ok) { showToast("Could not suspend", "error"); return; }
    showToast("User suspended", "success");
    await loadUsers();
    renderUsers();
}

async function activateUser(userId) {
    if (!confirm("Activate this user?")) return;

    const result = await apiPut("/IcbtAdmin/users/" + userId + "/activate", {});
    if (!result.ok) { showToast("Could not activate", "error"); return; }
    showToast("User activated", "success");
    await loadUsers();
    renderUsers();
}

async function deleteUser(userId) {
    if (!confirm("Confirm delete user?")) return;

    const result = await apiDelete("/IcbtAdmin/users/" + userId);
    if (!result.ok) { showToast("Could not delete", "error"); return; }
    showToast("User deleted", "success");
    await loadUsers();
    renderUsers();
}

function renderAddExecutive() {
    const container = document.getElementById("tab-add-executive");
    if (!container) return;

    let options = "";
    clubs.forEach(function (club) {
        const presidentId = clubPresidentMap[club.clubId];
        const label = club.name + ' — ' + club.category + (presidentId ? '' : ' (no president)');
        options += '<option value="' + club.clubId + '">' + escapeHtml(label) + '</option>';
    });

    if (clubs.length === 0) {
        container.innerHTML =
            '<div class="section-head"><div><h2>Add Executive</h2><div class="sub">Create a board account for an existing club.</div></div></div>' +
            '<div class="empty">No clubs exist yet — approve a club request first.</div>';
        return;
    }

    container.innerHTML =
        '<div class="section-head"><div><h2>Add Executive</h2><div class="sub">Create a board account for an existing club.</div></div></div>' +
        '<div class="login-panel" style="max-width:520px;margin:0">' +
            '<div class="field"><label>Club</label><select id="exClubId">' + options + '</select></div>' +
            '<div class="field"><label>Position</label>' +
                '<select id="exPosition">' +
                    '<option value="President">President (max 1)</option>' +
                    '<option value="Vice President">Vice President (max 2)</option>' +
                    '<option value="Secretary">Secretary (max 1)</option>' +
                    '<option value="Treasurer">Treasurer (max 1)</option>' +
                    '<option value="Head of Event Management">Head of Event Management (max 1)</option>' +
                    '<option value="Marketing Head">Marketing Head (max 1)</option>' +
                    '<option value="Digital Creator">Digital Creator (max 1)</option>' +
                    '<option value="Asst. Secretary">Asst. Secretary (max 1)</option>' +
                    '<option value="Asst. Treasurer & Digital Creator">Asst. Treasurer & Digital Creator (max 1)</option>' +
                    '<option value="Educational Resource Coordinator">Educational Resource Coordinator (max 1)</option>' +
                    '<option value="Academic Coordinator">Academic Coordinator (max 3)</option>' +
                    '<option value="Non Academic Coordinator">Non Academic Coordinator (max 2)</option>' +
                    '<option value="Social Media Manager">Social Media Manager (max 1)</option>' +
                '</select>' +
            '</div>' +
            '<div class="field"><label>Full name</label><input id="exFullName" maxlength="100"></div>' +
            '<div class="field"><label>Email</label><input id="exEmail" type="email" maxlength="100"></div>' +
            '<div class="field"><label>Password (min 8)</label><input id="exPassword" type="password"></div>' +
            '<div class="field"><label>Phone</label><input id="exPhone" maxlength="15" placeholder="+94771234567"></div>' +
            '<div id="exMessage" class="alert hidden"></div>' +
            '<button class="btn full" onclick="submitExecutive()">Create executive account</button>' +
        '</div>';
}

async function submitExecutive() {
    const message = document.getElementById("exMessage");
    message.className = "alert hidden";
    message.textContent = "";

    const body = {
        fullName: document.getElementById("exFullName").value.trim(),
        email: document.getElementById("exEmail").value.trim(),
        password: document.getElementById("exPassword").value,
        phoneNumber: document.getElementById("exPhone").value.trim(),
        clubId: Number(document.getElementById("exClubId").value),
        position: document.getElementById("exPosition").value
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

    if (body.password.length < 8) {
        showModalError(message, "Password must be at least 8 characters.");
        return;
    }

    if (!isStrongPassword(body.password)) {
        showModalError(message, "Password must contain at least one letter and one number.");
        return;
    }

    if (!isValidSriLankanPhone(body.phoneNumber)) {
        showModalError(message, "Phone number must be in the format +947XXXXXXXX");
        return;
    }

    if (!confirm("Confirm create executive account?")) return;

    const result = await apiPost("/ClubMember/executive", body);

    if (!result.ok) {
        if (result.data && result.data.errors) {
            showModalError(message, getFirstValidationError(result.data.errors));
            return;
        }
        showModalError(message, "Could not create — email taken, club missing, or position already filled.");
        return;
    }

    message.className = "alert good";
    message.textContent = "Executive account created.";

    document.getElementById("exFullName").value = "";
    document.getElementById("exEmail").value = "";
    document.getElementById("exPassword").value = "";
    document.getElementById("exPhone").value = "";

    await loadUsers();
    await loadClubPresidents();
    renderUsers();
    renderSocieties();
    renderAddExecutive();
}

function renderAnalytics() {
    const container = document.getElementById("tab-analytics");
    if (!container) return;

    const summary = analyticsSummary || { activeClubs: 0, liveEvents: 0, pendingReviews: 0, totalEnrollments: 0 };
    const maxMembers = Math.max(1, ...analyticsMembers.map(function (m) { return m.memberCount; }));
    const maxEvents = Math.max(1, ...analyticsEvents.map(function (e) { return e.eventCount; }));

    let html =
        '<div class="section-head"><div><h2>Analytics</h2><div class="sub">Platform overview.</div></div></div>';

    html +=
        '<div class="pulse" style="margin-bottom:24px">' +
            '<div class="cell"><div class="n">' + summary.activeClubs + '</div><div class="l">Active clubs</div></div>' +
            '<div class="cell"><div class="n">' + summary.liveEvents + '</div><div class="l">Live events</div></div>' +
            '<div class="cell"><div class="n">' + summary.pendingReviews + '</div><div class="l">Pending reviews</div></div>' +
            '<div class="cell"><div class="n">' + summary.totalEnrollments + '</div><div class="l">Total orders</div></div>' +
        '</div>';

    html += '<div class="card" style="margin-bottom:16px"><h4>Members by club</h4>';
    if (analyticsMembers.length === 0) {
        html += '<div class="sub" style="padding:10px 0;color:var(--ink-faint)">No members found in any clubs yet.</div>';
    } else {
        analyticsMembers.forEach(function (row) {
            html += '<div class="bar-row"><div class="bar-label">' + escapeHtml(row.clubName) + '</div><div class="bar-track"><div class="bar-fill" style="width:' + Math.round(row.memberCount / maxMembers * 100) + '%"></div></div><div class="bar-val">' + row.memberCount + '</div></div>';
        });
    }
    html += '</div>';

    html += '<div class="card"><h4>Events by club</h4>';
    if (analyticsEvents.length === 0) {
        html += '<div class="sub" style="padding:10px 0;color:var(--ink-faint)">No events created in any clubs yet.</div>';
    } else {
        analyticsEvents.forEach(function (row) {
            html += '<div class="bar-row"><div class="bar-label">' + escapeHtml(row.clubName) + '</div><div class="bar-track"><div class="bar-fill" style="width:' + Math.round(row.eventCount / maxEvents * 100) + '%"></div></div><div class="bar-val">' + row.eventCount + '</div></div>';
        });
    }
    html += '</div>';

    container.innerHTML = html;
}