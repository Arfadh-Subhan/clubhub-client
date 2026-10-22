let currentUser = null;
let isMemberMode = false;
let myClubId = null;
let myClub = null;
let clubEvents = [];
let clubMeetings = [];
let boardMembers = [];
let clubMembers = [];
let pendingRequests = [];
let clubPosts = [];
let clubAnnouncements = [];
let clubProducts = [];
let clubGalleries = [];
let galleryPhotosMap = {};
let clubOrders = [];
let chatMessages = [];

let selectedLogoBytes = null;
let selectedCoverBytes = null;
let selectedEventPosterBytes = null;
let selectedEventProofBytes = null;
let selectedEventProofName = "";
let selectedPostCoverBytes = null;
let selectedProductImageBytes = null;
let selectedGalleryCoverBytes = null;
let selectedPhotoBytes = null;

document.addEventListener("DOMContentLoaded", async function () {
    currentUser = requireLogin();
    if (!currentUser) return;

    isMemberMode = isMemberView();

    if (isMemberMode) {
        const params = new URLSearchParams(window.location.search);
        myClubId = Number(params.get("clubId"));
        if (!myClubId) {
            window.location.href = "../student/dashboard.html?tab=my-clubs";
            return;
        }
    } else {
        const membership = await findMyClubMembership();
        if (!membership) {
            showToast("No club assigned to your account", "error");
            return;
        }
        myClubId = membership.clubId;
    }

    bootstrapPage(getActiveTabKey());
    loadPulseForUser(currentUser);
    await loadMyClub();
    await loadAll();
    switchTabFromUrl();
    await loadChat();
});

function getActiveTabKey() {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || (isMemberMode ? "events" : "club-settings");
}

function switchTabFromUrl() {
    showTab(getActiveTabKey());
}

function showTab(tabKey) {
    document.querySelectorAll(".tab-pane").forEach(function (pane) { pane.style.display = "none"; });
    const active = document.getElementById("tab-" + tabKey);
    if (active) active.style.display = "block";
}

async function findMyClubMembership() {
    try {
        const result = await apiGet("/ClubMember/user/" + currentUser.userId);
        const list = Array.isArray(result) ? result : [];
        return list.find(function (m) { return m.status === "Approved"; }) || null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function loadMyClub() {
    try {
        const result = await apiGet("/Club/" + myClubId);
        myClub = result || null;
    } catch (error) { console.error(error); }
}

async function loadAll() {
    await Promise.all([
        loadClubEvents(),
        loadClubMeetings(),
        loadBoardMembers(),
        loadClubMembers(),
        loadPendingRequests(),
        loadClubPosts(),
        loadClubAnnouncements(),
        loadClubProducts(),
        loadClubGalleries()
    ]);
    await loadClubOrders();
    renderAll();
}

async function loadClubEvents() {
    try {
        const result = await apiGet("/Event/club/" + myClubId);
        clubEvents = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadClubMeetings() {
    try {
        const result = await apiGet("/ClubMeeting/club/" + myClubId);
        clubMeetings = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadBoardMembers() {
    try {
        const result = await apiGet("/ClubMember/club/" + myClubId);
        const list = Array.isArray(result) ? result : [];
        boardMembers = list.filter(function (member) { return member.clubRole === "Executive"; });
    } catch (error) { console.error(error); }
}

async function loadClubMembers() {
    try {
        const result = await apiGet("/ClubMember/club/" + myClubId);
        clubMembers = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadPendingRequests() {
    try {
        const result = await apiGet("/ClubMember/pending/" + myClubId);
        pendingRequests = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadClubPosts() {
    try {
        const result = await apiGet("/ClubPost/club/" + myClubId);
        clubPosts = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadClubAnnouncements() {
    try {
        const result = await apiGet("/ClubAnnouncement/club/" + myClubId);
        clubAnnouncements = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadClubProducts() {
    try {
        const result = await apiGet("/ClubProduct/club/" + myClubId);
        clubProducts = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadClubGalleries() {
    try {
        const result = await apiGet("/ClubGallery/club/" + myClubId);
        clubGalleries = Array.isArray(result) ? result : [];
        for (const gallery of clubGalleries) {
            try {
                const photos = await apiGet("/GalleryPhoto/gallery/" + gallery.clubGalleryId);
                galleryPhotosMap[gallery.clubGalleryId] = Array.isArray(photos) ? photos : [];
            } catch (error) { console.error(error); }
        }
    } catch (error) { console.error(error); }
}

async function loadClubOrders() {
    try {
        if (clubProducts.length === 0) { clubOrders = []; return; }
        const all = [];
        for (const product of clubProducts) {
            try {
                const list = await apiGet("/Order/product/" + product.clubProductId);
                if (Array.isArray(list)) all.push(...list);
            } catch (error) { console.error(error); }
        }
        clubOrders = all;
    } catch (error) { console.error(error); }
}

function renderAll() {
    if (!isMemberMode) renderClubSettings();
    renderMemberClubHeader();
    renderEvents();
    renderMeetings();
    renderBoardMembers();
    renderMembers();
    renderJoinRequests();
    renderPosts();
    renderAnnouncements();
    renderProducts();
    renderGallery();
    renderOrders();
}

function renderMemberClubHeader() {
    if (!isMemberMode) return;
    if (!myClub) return;

    const container = document.querySelector(".main");
    if (!container) return;
    if (document.getElementById("memberClubHeader")) return;

    const logoUri = decodeImage(myClub.logo);

    const header = document.createElement("div");
    header.id = "memberClubHeader";
    header.className = "card";
    header.style.cssText = "display:flex;align-items:center;gap:16px;padding:18px 22px;margin-bottom:24px";

    header.innerHTML =
        (logoUri
            ? '<img src="' + logoUri + '" style="width:56px;height:56px;object-fit:contain;background:var(--panel-2);border-radius:var(--radius-sm);padding:6px;flex-shrink:0">'
            : '<div style="width:56px;height:56px;border-radius:var(--radius-sm);background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;flex-shrink:0">' + escapeHtml(myClub.name.charAt(0).toUpperCase()) + '</div>') +
        '<div style="flex:1;min-width:0">' +
            '<div style="font-size:16px;font-weight:700;color:var(--ink)">' + escapeHtml(myClub.name) + '</div>' +
            '<div style="font-size:13px;color:var(--ink-soft);margin-top:2px">' + escapeHtml(myClub.category) + '</div>' +
        '</div>' +
        '<span class="tag good" style="flex-shrink:0">Already joined</span>';

    const pulse = container.querySelector(".pulse");
    if (pulse) {
        pulse.parentNode.insertBefore(header, pulse.nextSibling);
    } else {
        container.prepend(header);
    }
}

function readFileAsBase64(input, callback) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        callback(e.target.result.split(",")[1], file.name, e.target.result);
    };
    reader.readAsDataURL(file);
}

function bindFileInput(inputId, onLoaded) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener("change", function () {
        readFileAsBase64(this, onLoaded);
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

function renderClubSettings() {
    const container = document.getElementById("tab-club-settings");
    if (!container || !myClub) return;

    const logoUri = decodeImage(myClub.logo);
    const coverUri = decodeImage(myClub.coverPhoto);

    container.innerHTML =
        '<div class="section-head"><div><h2>Club settings</h2><div class="sub">Club name and category are managed by ICBT Admin. Description and images can be edited here.</div></div></div>' +
        '<div class="login-panel" style="max-width:560px;margin:0">' +
            '<div class="field">' +
                '<label>Club name</label>' +
                '<input id="csName" maxlength="100" value="' + escapeHtml(myClub.name) + '" disabled style="background:var(--panel-2);cursor:not-allowed;color:var(--ink-soft)">' +
                '<div style="font-size:12px;color:var(--ink-faint);margin-top:4px">Managed by ICBT Admin</div>' +
            '</div>' +
            '<div class="field">' +
                '<label>Category</label>' +
                '<input id="csCategory" maxlength="50" value="' + escapeHtml(myClub.category) + '" disabled style="background:var(--panel-2);cursor:not-allowed;color:var(--ink-soft)">' +
                '<div style="font-size:12px;color:var(--ink-faint);margin-top:4px">Managed by ICBT Admin</div>' +
            '</div>' +
            '<div class="field"><label>Description</label><textarea id="csDescription" maxlength="1000">' + escapeHtml(myClub.description) + '</textarea></div>' +
            '<div class="field">' +
                '<label>Logo (optional)</label>' +
                '<img id="csLogoPreview" class="photo-preview cs-logo-preview" ' + (logoUri ? 'src="' + logoUri + '" style="display:block"' : '') + '>' +
                buildDropZone("csLogoInput", "image/*") +
            '</div>' +
            '<div class="field">' +
                '<label>Cover photo (optional)</label>' +
                '<img id="csCoverPreview" class="photo-preview" ' + (coverUri ? 'src="' + coverUri + '" style="display:block"' : '') + '>' +
                buildDropZone("csCoverInput", "image/*") +
            '</div>' +
            '<div id="csMessage" class="alert hidden"></div>' +
            '<button class="btn full" onclick="submitClubSettings()">Save changes</button>' +
        '</div>';

    bindFileInput("csLogoInput", async function (base64, name, dataUri) {
        const input = document.getElementById("csLogoInput");
        const file = input.files[0];
        if (!file) return;

        const cropped = await openCropper(file, 1, 512, 512);
        if (!cropped) return;

        selectedLogoBytes = cropped.split(",")[1];
        const preview = document.getElementById("csLogoPreview");
        preview.src = cropped;
        preview.style.display = "block";
    });

    bindFileInput("csCoverInput", async function (base64, name, dataUri) {
        const input = document.getElementById("csCoverInput");
        const file = input.files[0];
        if (!file) return;

        const cropped = await openCropper(file, 16 / 9, 1920, 1080);
        if (!cropped) return;

        selectedCoverBytes = cropped.split(",")[1];
        const preview = document.getElementById("csCoverPreview");
        preview.src = cropped;
        preview.style.display = "block";
    });
}

async function submitClubSettings() {
    const message = document.getElementById("csMessage");
    message.className = "alert hidden";
    message.textContent = "";

    const body = {
        name: document.getElementById("csName").value.trim(),
        category: document.getElementById("csCategory").value.trim(),
        description: document.getElementById("csDescription").value.trim(),
        logo: selectedLogoBytes || myClub.logo || null,
        coverPhoto: selectedCoverBytes || myClub.coverPhoto || null
    };

    if (!body.description) {
        message.className = "alert bad";
        message.textContent = "Description is required.";
        return;
    }

    if (!confirm("Save club changes?")) return;

    const result = await apiPut("/Club/" + myClubId, body);

    if (!result.ok) {
        message.className = "alert bad";
        message.textContent = "Could not save changes.";
        return;
    }

    message.className = "alert good";
    message.textContent = "Club updated.";

    selectedLogoBytes = null;
    selectedCoverBytes = null;

    await loadMyClub();
    renderClubSettings();
}

function renderEvents() {
    const container = document.getElementById("tab-events");
    if (!container) return;

    let html = '<div class="section-head"><div><h2>Events</h2><div class="sub">' + (isMemberMode ? "Club events." : "New events are reviewed by the ICBT team before going live.") + '</div></div>';
    if (!isMemberMode) {
        html += '<div style="display:flex;gap:10px;align-items:center">' +
            '<button class="btn sm" onclick="openCreateEventModal()">+ Propose event</button>' +
            '<a class="Btn" href="../../assets/docs/eventpermission.pdf" download="eventpermission.pdf" aria-label="Download event permission form">' +
                '<svg class="svgIcon" viewBox="0 0 384 512" height="1em" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"></path>' +
                '</svg>' +
                '<span class="icon2"></span>' +
                '<span class="tooltip">Download event proposal</span>' +
            '</a>' +
        '</div>';
    }
    html += '</div>';

    if (clubEvents.length === 0) {
        html += '<div class="empty">No events yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="grid">';
    clubEvents.forEach(function (eventItem) {
        const posterUri = decodeImage(eventItem.poster);
        const logoBlock = posterUri
            ? '<img src="' + posterUri + '" alt="' + escapeHtml(eventItem.name) + '">'
            : '<div class="initial">' + escapeHtml(eventItem.name.charAt(0).toUpperCase()) + '</div>';

        const eventDate = formatDate(eventItem.eventStartAt) + ' · ' + escapeHtml(eventItem.venue);

        let badgeClass = "warn";
        let badgeText = "Pending";
        if (eventItem.status === "Approved") { badgeClass = "good"; badgeText = "Approved"; }
        if (eventItem.status === "Rejected") { badgeClass = "bad"; badgeText = "Rejected"; }

        const detailUrl = '../event-detail.html?eventId=' + eventItem.eventId + '&clubId=' + myClubId;

        html +=
            '<div class="club-card-u" onclick="window.location.href=\'' + detailUrl + '\'">' +
                '<span class="tag" style="left:12px;top:12px">Event</span>' +
                '<span class="tag ' + badgeClass + '" style="left:auto;right:12px;top:12px">' + badgeText + '</span>' +
                '<div class="wrapper">' +
                    '<div class="card-image">' + logoBlock + '</div>' +
                    '<div class="content">' +
                        '<p class="title">' + escapeHtml(eventItem.name) + '</p>' +
                        '<p class="sub">' + eventDate + '</p>' +
                    '</div>' +
                    '<button class="card-btn" onclick="event.stopPropagation(); window.location.href=\'' + detailUrl + '\'">View event</button>' +
                    (isMemberMode ? '' :
                        '<button class="btn ghost sm" style="width:100%;margin-top:6px" onclick="event.stopPropagation(); deleteEvent(' + eventItem.eventId + ')">Remove</button>') +
                '</div>' +
            '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
}

function openCreateEventModal() {
    selectedEventPosterBytes = null;
    selectedEventProofBytes = null;
    selectedEventProofName = "";

    openModal(
        '<h3>Propose an event</h3>' +
        '<div class="field"><label>Event name</label><input id="evName" maxlength="200"></div>' +
        '<div class="form-row">' +
            '<div class="field"><label>Date</label><input id="evDate" type="date"></div>' +
            '<div class="field"><label>Time</label><input id="evTime" placeholder="e.g. 3:00 PM" maxlength="20"></div>' +
        '</div>' +
        '<div class="field"><label>Venue</label><input id="evVenue" maxlength="200"></div>' +
        '<div class="field"><label>Description</label><textarea id="evDescription" maxlength="2000"></textarea></div>' +
        '<div class="field">' +
            '<label>Poster image</label>' +
            '<div style="font-size:12px;color:var(--ink-faint);margin-bottom:6px">Recommended: 720 × 540 px (4:3 ratio). Other sizes will be cropped to fit.</div>' +
            '<img id="evPosterPreview" class="photo-preview">' +
            buildDropZone("evPosterInput", "image/*") +
        '</div>' +
        '<div class="field"><label>Registration links (optional — one per line)</label><textarea id="evLinks" maxlength="1000" placeholder="https://forms.gle/..."></textarea></div>' +
        '<div class="form-row">' +
            '<div class="field"><label>Capacity</label><input id="evCapacity" type="number" min="1"></div>' +
            '<div class="field"><label>Estimated budget</label><input id="evBudget" type="number" step="0.01" min="0.01"></div>' +
        '</div>' +
        '<div class="field">' +
            '<label>Permission proof (PDF / image)</label>' +
            buildDropZone("evProofInput", "image/*,.pdf") +
        '</div>' +
        '<button class="btn full" onclick="submitEvent()">Submit for approval</button>'
    );

    bindFileInput("evPosterInput", async function (base64, name, dataUri) {
        const input = document.getElementById("evPosterInput");
        const file = input.files[0];
        if (!file) return;

        const cropped = await openCropper(file, 4 / 3, 1440, 1080);
        if (!cropped) return;

        selectedEventPosterBytes = cropped.split(",")[1];
        const preview = document.getElementById("evPosterPreview");
        preview.src = cropped;
        preview.style.display = "block";
    });

    bindFileInput("evProofInput", function (base64, name) {
        selectedEventProofBytes = base64;
        selectedEventProofName = name;
        const dropZoneTitle = document.querySelector('label[for="evProofInput"] .drop-zone-title');
        if(dropZoneTitle) dropZoneTitle.textContent = "✓ " + name;
    });
}

async function submitEvent() {
    const name = document.getElementById("evName").value.trim();
    const date = document.getElementById("evDate").value;
    const time = document.getElementById("evTime").value.trim();
    const venue = document.getElementById("evVenue").value.trim();
    const description = document.getElementById("evDescription").value.trim();
    const links = document.getElementById("evLinks").value.trim();
    const capacity = document.getElementById("evCapacity").value;
    const budget = document.getElementById("evBudget").value;

    if (!name || !date || !time || !venue || !description) {
        showToast("Fill in all required fields", "error");
        return;
    }

    if (!selectedEventPosterBytes) {
        showToast("Poster image is required", "error");
        return;
    }

    if (!capacity || Number(capacity) <= 0) {
        showToast("Capacity is required", "error");
        return;
    }

    if (!budget || Number(budget) <= 0) {
        showToast("Estimated budget is required", "error");
        return;
    }

    if (!selectedEventProofBytes) {
        showToast("Permission proof is required", "error");
        return;
    }

    if (!confirm("Confirm request event?")) return;

    const body = {
        clubId: myClubId,
        name: name,
        description: description,
        eventDate: date,
        eventTime: time,
        venue: venue,
        poster: selectedEventPosterBytes,
        links: links || null,
        capacity: Number(capacity),
        estimatedBudget: Number(budget),
        permissionProof: selectedEventProofBytes,
        createdBy: currentUser.userId
    };

    const result = await apiPost("/Event", body);
    if (!result.ok) { showToast("Could not submit", "error"); return; }
    closeModal();
    showToast("Event submitted for approval", "success");
    await loadClubEvents();
    renderEvents();
}

async function deleteEvent(eventId) {
    if (!confirm("Delete this event?")) return;
    const result = await apiDelete("/Event/" + eventId);
    if (!result.ok) { showToast("Could not delete", "error"); return; }
    showToast("Event deleted", "success");
    await loadClubEvents();
    renderEvents();
}

function renderMeetings() {
    const container = document.getElementById("tab-meetings");
    if (!container) return;

    let html = '<div class="section-head"><div><h2>Meetings</h2><div class="sub">' + (isMemberMode ? "Club internal — view only." : "Schedule directly — no approval needed.") + '</div></div>';
    if (!isMemberMode) html += '<button class="btn sm" onclick="openCreateMeetingModal()">+ Schedule meeting</button>';
    html += '</div>';

    if (clubMeetings.length === 0) {
        html += '<div class="empty">No meetings scheduled.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Title</th><th>Date</th><th>Time</th><th>Location</th>' + (isMemberMode ? '' : '<th></th>') + '</tr>';
    clubMeetings.forEach(function (meeting) {
        html +=
            '<tr>' +
                '<td>' + escapeHtml(meeting.title) + '</td>' +
                '<td>' + formatDate(meeting.meetingDate) + '</td>' +
                '<td>' + escapeHtml(meeting.meetingTime) + '</td>' +
                '<td>' + escapeHtml(meeting.location) + '</td>' +
                (isMemberMode ? '' : '<td><button class="btn ghost sm" onclick="deleteMeeting(' + meeting.clubMeetingId + ')">Remove</button></td>') +
            '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
}

function openCreateMeetingModal() {
    openModal(
        '<h3>Schedule a meeting</h3>' +
        '<div class="field"><label>Title</label><input id="mtTitle" maxlength="200"></div>' +
        '<div class="form-row">' +
            '<div class="field"><label>Date</label><input id="mtDate" type="date"></div>' +
            '<div class="field"><label>Time</label><input id="mtTime" maxlength="20" placeholder="e.g. 5:00 PM"></div>' +
        '</div>' +
        '<div class="field"><label>Location</label><input id="mtLocation" maxlength="200"></div>' +
        '<div class="field"><label>Description</label><textarea id="mtDescription" maxlength="1000"></textarea></div>' +
        '<button class="btn full" onclick="submitMeeting()">Schedule</button>'
    );
}

async function submitMeeting() {
    const title = document.getElementById("mtTitle").value.trim();
    const date = document.getElementById("mtDate").value;
    const time = document.getElementById("mtTime").value.trim();
    const location = document.getElementById("mtLocation").value.trim();
    const description = document.getElementById("mtDescription").value.trim();

    if (!title || !date || !time || !location || !description) {
        showToast("Fill in all fields", "error");
        return;
    }

    if (!confirm("Confirm meeting schedule?")) return;

    const body = {
        clubId: myClubId,
        title: title,
        description: description,
        location: location,
        meetingDate: date,
        meetingTime: time,
        createdBy: currentUser.userId
    };

    const result = await apiPost("/ClubMeeting", body);
    if (!result.ok) { showToast("Could not schedule", "error"); return; }
    closeModal();
    showToast("Meeting scheduled", "success");
    await loadClubMeetings();
    renderMeetings();
}

async function deleteMeeting(meetingId) {
    if (!confirm("Delete this meeting?")) return;
    const result = await apiDelete("/ClubMeeting/" + meetingId);
    if (!result.ok) { showToast("Could not delete", "error"); return; }
    showToast("Meeting deleted", "success");
    await loadClubMeetings();
    renderMeetings();
}

function renderBoardMembers() {
    const container = document.getElementById("tab-board-members");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Board members</h2><div class="sub">' + (isMemberMode ? "Club leadership." : "Read-only — ICBT admin manages board positions.") + '</div></div></div>';

    if (boardMembers.length === 0) {
        html += '<div class="empty">No board members listed yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Member</th><th>Position</th>' + (isMemberMode ? '' : '<th>Status</th>') + '</tr>';
    boardMembers.forEach(function (member) {
        html +=
            '<tr>' +
                '<td>' + escapeHtml(member.fullName) + '</td>' +
                '<td>' + escapeHtml(member.position || "—") + '</td>' +
                (isMemberMode ? '' : '<td><span class="tag good">' + escapeHtml(member.status) + '</span></td>') +
            '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
}

function renderMembers() {
    const container = document.getElementById("tab-members");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Members</h2><div class="sub">Approved members of your club.</div></div></div>';

    if (clubMembers.length === 0) {
        html += '<div class="empty">No approved members yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Member</th><th>Role</th><th>Position</th><th>Status</th></tr>';
    clubMembers.forEach(function (member) {
        html +=
            '<tr>' +
                '<td>' + escapeHtml(member.fullName) + '</td>' +
                '<td>' + escapeHtml(member.clubRole) + '</td>' +
                '<td>' + escapeHtml(member.position || "—") + '</td>' +
                '<td><span class="tag good">' + escapeHtml(member.status) + '</span></td>' +
            '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
}

function renderJoinRequests() {
    const container = document.getElementById("tab-join-requests");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Join requests</h2><div class="sub">' + (isMemberMode ? "Pending join requests." : "Approve or reject students wanting to join.") + '</div></div></div>';

    if (pendingRequests.length === 0) {
        html += '<div class="empty">No pending join requests.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Member</th><th>Requested</th>' + (isMemberMode ? '' : '<th></th>') + '</tr>';
    pendingRequests.forEach(function (request) {
        html +=
            '<tr>' +
                '<td>' + escapeHtml(request.fullName) + '</td>' +
                '<td>' + formatDate(request.createdAt) + '</td>' +
                (isMemberMode ? '' :
                    '<td>' +
                        '<button class="btn good sm" onclick="respondJoinRequest(' + request.clubMemberId + ', true)">Approve</button>' +
                        '<button class="btn ghost sm" style="margin-left:6px" onclick="respondJoinRequest(' + request.clubMemberId + ', false)">Reject</button>' +
                    '</td>') +
            '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
}

async function respondJoinRequest(clubMemberId, approve) {
    if (!confirm(approve ? "Approve this member?" : "Reject this member?")) return;

    const url = "/ClubMember/" + clubMemberId + (approve ? "/approve" : "/reject");
    const result = await apiPut(url, { reviewedBy: currentUser.userId });
    if (!result.ok) { showToast("Could not update", "error"); return; }
    showToast(approve ? "Member approved" : "Request rejected", "success");
    await loadPendingRequests();
    await loadClubMembers();
    renderJoinRequests();
    renderMembers();
}

function renderPosts() {
    const container = document.getElementById("tab-posts");
    if (!container) return;

    let html = '<div class="section-head"><div><h2>Projects &amp; posts</h2><div class="sub">' + (isMemberMode ? "What your club has been building." : "Needs ICBT approval before going live.") + '</div></div>';
    if (!isMemberMode) html += '<button class="btn sm" onclick="openCreatePostModal()">+ New post</button>';
    html += '</div>';

    if (clubPosts.length === 0) {
        html += '<div class="empty">No posts yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="grid">';
    clubPosts.forEach(function (post) {
        let statusTag = '<span class="tag warn">Pending</span>';
        if (post.status === "Approved") statusTag = '<span class="tag good">Approved</span>';
        if (post.status === "Rejected") statusTag = '<span class="tag bad">Rejected</span>';

        const coverUri = decodeImage(post.coverImage);

        html +=
            '<article class="card">' +
                (coverUri ? '<img class="post-photo post-photo-clickable" src="' + coverUri + '" alt="" onclick="event.stopPropagation(); openImageLightbox(\'' + coverUri + '\')">' : '') +
                statusTag +
                '<h4 style="margin-top:10px">' + escapeHtml(post.title) + '</h4>' +
                '<p class="desc">' + escapeHtml(post.description) + '</p>' +
                (isMemberMode ? '' :
                    '<div class="card-actions">' +
                        '<button class="btn ghost sm" onclick="deletePost(' + post.clubPostId + ')">Remove</button>' +
                    '</div>') +
            '</article>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function openCreatePostModal() {
    selectedPostCoverBytes = null;

    openModal(
        '<h3>New post</h3>' +
        '<div class="field"><label>Title</label><input id="pstTitle" maxlength="200"></div>' +
        '<div class="field"><label>Category</label><input id="pstCategory" maxlength="50" placeholder="e.g. Project"></div>' +
        '<div class="field"><label>Description</label><textarea id="pstDescription" maxlength="2000"></textarea></div>' +
        '<div class="field">' +
            '<label>Cover image (optional)</label>' +
            '<img id="pstCoverPreview" class="photo-preview">' +
            buildDropZone("pstCoverInput", "image/*") +
        '</div>' +
        '<div class="field"><label>Links (optional — one per line)</label><textarea id="pstLinks" maxlength="1000" placeholder="https://..."></textarea></div>' +
        '<button class="btn full" onclick="submitPost()">Submit for approval</button>'
    );

    bindFileInput("pstCoverInput", async function (base64, name, dataUri) {
        const input = document.getElementById("pstCoverInput");
        const file = input.files[0];
        if (!file) return;

        const cropped = await openCropper(file, 16 / 9, 1600, 900);
        if (!cropped) return;

        selectedPostCoverBytes = cropped.split(",")[1];
        const preview = document.getElementById("pstCoverPreview");
        preview.src = cropped;
        preview.style.display = "block";
    });
}

async function submitPost() {
    const title = document.getElementById("pstTitle").value.trim();
    const category = document.getElementById("pstCategory").value.trim();
    const description = document.getElementById("pstDescription").value.trim();
    const links = document.getElementById("pstLinks").value.trim();

    if (!title || !category || !description) { showToast("Fill in all fields", "error"); return; }

    if (!confirm("Confirm request post?")) return;

    const body = {
        clubId: myClubId,
        title: title,
        category: category,
        description: description,
        coverImage: selectedPostCoverBytes || null,
        links: links || null,
        createdBy: currentUser.userId
    };

    const result = await apiPost("/ClubPost", body);
    if (!result.ok) { showToast("Could not submit", "error"); return; }
    closeModal();
    showToast("Post submitted for approval", "success");
    await loadClubPosts();
    renderPosts();
}

async function deletePost(postId) {
    if (!confirm("Delete this post?")) return;
    const result = await apiDelete("/ClubPost/" + postId);
    if (!result.ok) { showToast("Could not delete", "error"); return; }
    showToast("Post deleted", "success");
    await loadClubPosts();
    renderPosts();
}

function renderAnnouncements() {
    const container = document.getElementById("tab-announcements");
    if (!container) return;

    let html = '<div class="section-head"><div><h2>Announcements</h2><div class="sub">' + (isMemberMode ? "Latest news from your club." : "Add directly — no approval needed.") + '</div></div>';
    if (!isMemberMode) html += '<button class="btn sm" onclick="openCreateAnnouncementModal()">+ New announcement</button>';
    html += '</div>';

    if (clubAnnouncements.length === 0) {
        html += '<div class="empty">No announcements yet.</div>';
        container.innerHTML = html;
        return;
    }

    clubAnnouncements.forEach(function (announcement) {
        let statusTag = '<span class="tag warn">Pending</span>';
        if (announcement.status === "Approved") statusTag = '<span class="tag good">Approved</span>';
        if (announcement.status === "Rejected") statusTag = '<span class="tag bad">Rejected</span>';

        html +=
            '<div class="card" style="margin-bottom:12px">' +
                statusTag +
                '<h4 style="margin-top:10px">' + escapeHtml(announcement.title) + '</h4>' +
                '<p class="desc">' + escapeHtml(announcement.description) + '</p>' +
                (isMemberMode ? '' :
                    '<div class="card-actions">' +
                        '<button class="btn ghost sm" onclick="deleteAnnouncement(' + announcement.clubAnnouncementId + ')">Remove</button>' +
                    '</div>') +
            '</div>';
    });
    container.innerHTML = html;
}

function openCreateAnnouncementModal() {
    openModal(
        '<h3>New announcement</h3>' +
        '<div class="field"><label>Title</label><input id="annTitle" maxlength="200"></div>' +
        '<div class="field"><label>Description</label><textarea id="annDescription" maxlength="2000"></textarea></div>' +
        '<div class="field"><label>Links (optional — one per line)</label><textarea id="annLinks" maxlength="1000" placeholder="https://..."></textarea></div>' +
        '<button class="btn full" onclick="submitAnnouncement()">Post announcement</button>'
    );
}

async function submitAnnouncement() {
    const title = document.getElementById("annTitle").value.trim();
    const description = document.getElementById("annDescription").value.trim();
    const links = document.getElementById("annLinks").value.trim();

    if (!title || !description) { showToast("Fill in all fields", "error"); return; }

    if (!confirm("Confirm request announcement?")) return;

    const body = {
        clubId: myClubId,
        title: title,
        description: description,
        links: links || null,
        createdBy: currentUser.userId
    };

    const result = await apiPost("/ClubAnnouncement", body);
    if (!result.ok) { showToast("Could not submit", "error"); return; }
    closeModal();
    showToast("Announcement posted", "success");
    await loadClubAnnouncements();
    renderAnnouncements();
}

async function deleteAnnouncement(id) {
    if (!confirm("Delete this announcement?")) return;
    const result = await apiDelete("/ClubAnnouncement/" + id);
    if (!result.ok) { showToast("Could not delete", "error"); return; }
    showToast("Deleted", "success");
    await loadClubAnnouncements();
    renderAnnouncements();
}

function renderProducts() {
    const container = document.getElementById("tab-products");
    if (!container) return;

    let html = '<div class="section-head"><div><h2>Products</h2><div class="sub">' + (isMemberMode ? "Merch from your club." : "Needs ICBT approval before going live.") + '</div></div>';
    if (!isMemberMode) html += '<button class="btn sm" onclick="openCreateProductModal()">+ New product</button>';
    html += '</div>';

    if (clubProducts.length === 0) {
        html += '<div class="empty">No products yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="grid">';
    clubProducts.forEach(function (product) {
        const imgUri = decodeImage(product.image);
        const logoBlock = imgUri
            ? '<img src="' + imgUri + '" alt="' + escapeHtml(product.name) + '">'
            : '<div class="initial">' + escapeHtml(product.name.charAt(0).toUpperCase()) + '</div>';

        let badgeClass = "warn";
        let badgeText = "Pending";
        if (product.status === "Approved") { badgeClass = "good"; badgeText = "Approved"; }
        if (product.status === "Rejected") { badgeClass = "bad"; badgeText = "Rejected"; }

        const detailUrl = '../product-detail.html?productId=' + product.clubProductId + '&from=executive&clubId=' + myClubId;
        const priceLine = 'Rs. ' + Number(product.price).toLocaleString() + ' · Stock ' + product.stock;

        html +=
            '<div class="club-card-u" onclick="window.location.href=\'' + detailUrl + '\'">' +
                '<span class="tag" style="left:12px;top:12px">' + escapeHtml(product.category) + '</span>' +
                '<span class="tag ' + badgeClass + '" style="left:auto;right:12px;top:12px">' + badgeText + '</span>' +
                '<div class="wrapper">' +
                    '<div class="card-image">' + logoBlock + '</div>' +
                    '<div class="content">' +
                        '<p class="title">' + escapeHtml(product.name) + '</p>' +
                        '<p class="sub">' + priceLine + '</p>' +
                    '</div>' +
                    '<button class="card-btn" onclick="event.stopPropagation(); window.location.href=\'' + detailUrl + '\'">View product</button>' +
                    (isMemberMode ? '' :
                        '<button class="btn ghost sm" style="width:100%;margin-top:6px" onclick="event.stopPropagation(); deleteProduct(' + product.clubProductId + ')">Remove</button>') +
                '</div>' +
            '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
}

function openCreateProductModal() {
    selectedProductImageBytes = null;

    openModal(
        '<h3>New product</h3>' +
        '<div class="field"><label>Name</label><input id="prdName" maxlength="100"></div>' +
        '<div class="field"><label>Category</label><input id="prdCategory" maxlength="50" placeholder="e.g. Shirt"></div>' +
        '<div class="field"><label>Description</label><textarea id="prdDescription" maxlength="500"></textarea></div>' +
        '<div class="field">' +
            '<label>Product image (optional)</label>' +
            '<img id="prdImagePreview" class="photo-preview">' +
            buildDropZone("prdImageInput", "image/*") +
        '</div>' +
        '<div class="form-row">' +
            '<div class="field"><label>Price</label><input id="prdPrice" type="number" step="0.01"></div>' +
            '<div class="field"><label>Stock</label><input id="prdStock" type="number"></div>' +
        '</div>' +
        '<button class="btn full" onclick="submitProduct()">Submit for approval</button>'
    );

    bindFileInput("prdImageInput", async function (base64, name, dataUri) {
        const input = document.getElementById("prdImageInput");
        const file = input.files[0];
        if (!file) return;

        const cropped = await openCropper(file, 1, 800, 800);
        if (!cropped) return;

        selectedProductImageBytes = cropped.split(",")[1];
        const preview = document.getElementById("prdImagePreview");
        preview.src = cropped;
        preview.style.display = "block";
    });
}

async function submitProduct() {
    const name = document.getElementById("prdName").value.trim();
    const category = document.getElementById("prdCategory").value.trim();
    const description = document.getElementById("prdDescription").value.trim();
    const price = document.getElementById("prdPrice").value;
    const stock = document.getElementById("prdStock").value;

    if (!name || !category || !description || !price || !stock) { showToast("Fill in all fields", "error"); return; }

    if (!confirm("Confirm request product?")) return;

    const body = {
        clubId: myClubId,
        name: name,
        category: category,
        description: description,
        price: Number(price),
        image: selectedProductImageBytes || null,
        stock: Number(stock),
        createdBy: currentUser.userId
    };

    const result = await apiPost("/ClubProduct", body);
    if (!result.ok) { showToast("Could not submit", "error"); return; }
    closeModal();
    showToast("Product submitted for approval", "success");
    await loadClubProducts();
    renderProducts();
}

async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    const result = await apiDelete("/ClubProduct/" + id);
    if (!result.ok) { showToast("Could not delete", "error"); return; }
    showToast("Deleted", "success");
    await loadClubProducts();
    renderProducts();
}

function renderGallery() {
    const container = document.getElementById("tab-gallery");
    if (!container) return;

    let html = '<div class="section-head"><div><h2>Gallery</h2><div class="sub">' + (isMemberMode ? "Club photos." : "Add directly — no approval needed.") + '</div></div>';
    if (!isMemberMode) html += '<button class="btn sm" onclick="openCreateGalleryModal()">+ New gallery</button>';
    html += '</div>';

    if (clubGalleries.length === 0) {
        html += '<div class="empty">No galleries yet.</div>';
        container.innerHTML = html;
        return;
    }

    clubGalleries.forEach(function (gallery) {
        const photos = galleryPhotosMap[gallery.clubGalleryId] || [];
        const galleryCoverUri = decodeImage(gallery.coverPhoto);

        html +=
            '<div class="card" style="margin-bottom:16px">' +
                (galleryCoverUri ? '<img class="post-photo" src="' + galleryCoverUri + '" alt="">' : '') +
                '<h4>' + escapeHtml(gallery.title) + '</h4>' +
                '<p class="desc">' + escapeHtml(gallery.description) + '</p>' +
                (isMemberMode ? '' :
                    '<div class="card-actions">' +
                        '<button class="btn ghost sm" onclick="openUploadPhotoModal(' + gallery.clubGalleryId + ')">+ Upload photo</button>' +
                        '<button class="btn ghost sm" onclick="deleteGallery(' + gallery.clubGalleryId + ')">Remove gallery</button>' +
                    '</div>') +
                '<div class="grid" style="margin-top:12px">' +
                    photos.map(function (photo) {
                        const uri = decodeImage(photo.photo);
                        return '<div style="border:1px solid var(--line);border-radius:8px;overflow:hidden">' +
                            '<img src="' + uri + '" class="gallery-photo-clickable" style="width:100%;height:120px;object-fit:cover;display:block" alt="" onclick="openImageLightbox(\'' + uri + '\')">' +
                            '<div style="padding:6px;font-size:11.5px">' + escapeHtml(photo.caption || "") + '</div>' +
                            (isMemberMode ? '' : '<button class="btn ghost sm" onclick="deletePhoto(' + photo.galleryPhotoId + ')">Remove</button>') +
                        '</div>';
                    }).join('') +
                '</div>' +
            '</div>';
    });

    container.innerHTML = html;
}

function openCreateGalleryModal() {
    selectedGalleryCoverBytes = null;

    openModal(
        '<h3>New gallery folder</h3>' +
        '<div class="field"><label>Title</label><input id="galTitle" maxlength="200"></div>' +
        '<div class="field"><label>Description</label><textarea id="galDescription" maxlength="1000"></textarea></div>' +
        '<div class="field">' +
            '<label>Cover photo (optional)</label>' +
            '<img id="galCoverPreview" class="photo-preview">' +
            buildDropZone("galCoverInput", "image/*") +
        '</div>' +
        '<button class="btn full" onclick="submitGallery()">Create</button>'
    );

    bindFileInput("galCoverInput", async function (base64, name, dataUri) {
        const input = document.getElementById("galCoverInput");
        const file = input.files[0];
        if (!file) return;

        const cropped = await openCropper(file, 16 / 9, 1600, 900);
        if (!cropped) return;

        selectedGalleryCoverBytes = cropped.split(",")[1];
        const preview = document.getElementById("galCoverPreview");
        preview.src = cropped;
        preview.style.display = "block";
    });
}

async function submitGallery() {
    const title = document.getElementById("galTitle").value.trim();
    const description = document.getElementById("galDescription").value.trim();
    if (!title || !description) { showToast("Fill in all fields", "error"); return; }

    if (!confirm("Confirm create gallery?")) return;

    const body = {
        clubId: myClubId,
        title: title,
        description: description,
        coverPhoto: selectedGalleryCoverBytes || null,
        createdBy: currentUser.userId
    };

    const result = await apiPost("/ClubGallery", body);
    if (!result.ok) { showToast("Could not create", "error"); return; }
    closeModal();
    showToast("Gallery created", "success");
    await loadClubGalleries();
    renderGallery();
}

async function deleteGallery(id) {
    if (!confirm("Delete this gallery?")) return;
    const result = await apiDelete("/ClubGallery/" + id);
    if (!result.ok) { showToast("Could not delete", "error"); return; }
    showToast("Deleted", "success");
    await loadClubGalleries();
    renderGallery();
}

function openUploadPhotoModal(clubGalleryId) {
    selectedPhotoBytes = null;

    openModal(
        '<h3>Upload photo</h3>' +
        '<div class="field">' +
            '<label>Photo</label>' +
            '<img id="photoPreview" class="photo-preview">' +
            buildDropZone("photoInput", "image/*") +
        '</div>' +
        '<div class="field"><label>Caption (optional)</label><input id="photoCaption" maxlength="200"></div>' +
        '<button class="btn full" onclick="submitPhoto(' + clubGalleryId + ')">Upload</button>'
    );

    bindFileInput("photoInput", async function (base64, name, dataUri) {
        const input = document.getElementById("photoInput");
        const file = input.files[0];
        if (!file) return;

        const cropped = await openCropper(file, 4 / 3, 1600, 1200);
        if (!cropped) return;

        selectedPhotoBytes = cropped.split(",")[1];
        const preview = document.getElementById("photoPreview");
        preview.src = cropped;
        preview.style.display = "block";
    });
}

async function submitPhoto(clubGalleryId) {
    const caption = document.getElementById("photoCaption").value.trim();

    if (!selectedPhotoBytes) { showToast("Choose a photo first", "error"); return; }

    if (!confirm("Confirm upload photo?")) return;

    const body = {
        clubGalleryId: clubGalleryId,
        photo: selectedPhotoBytes,
        caption: caption || null
    };

    const result = await apiPost("/GalleryPhoto", body);
    if (!result.ok) { showToast("Could not upload", "error"); return; }
    closeModal();
    showToast("Photo uploaded", "success");
    await loadClubGalleries();
    renderGallery();
}

async function deletePhoto(photoId) {
    if (!confirm("Delete this photo?")) return;
    const result = await apiDelete("/GalleryPhoto/" + photoId);
    if (!result.ok) { showToast("Could not delete", "error"); return; }
    showToast("Deleted", "success");
    await loadClubGalleries();
    renderGallery();
}

function renderOrders() {
    const container = document.getElementById("tab-orders");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Orders</h2><div class="sub">' + (isMemberMode ? "Order history — view only." : "Merch orders for your products.") + '</div></div></div>';

    if (clubOrders.length === 0) {
        html += '<div class="empty">No orders yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Order</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th>' + (isMemberMode ? '' : '<th></th>') + '</tr>';
    clubOrders.forEach(function (order) {
        html +=
            '<tr>' +
                '<td>#' + order.orderId + '</td>' +
                '<td>#' + order.clubProductId + '</td>' +
                '<td>' + order.quantity + '</td>' +
                '<td>Rs. ' + order.totalPrice.toLocaleString() + '</td>' +
                '<td><span class="tag">' + escapeHtml(order.status) + '</span></td>' +
                (isMemberMode ? '' : '<td><button class="btn ghost sm" onclick="updateOrderStatus(' + order.orderId + ')">Mark Delivered</button></td>') +
            '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
}

async function updateOrderStatus(orderId) {
    if (!confirm("Mark this order delivered?")) return;

    const result = await apiPut("/Order/" + orderId + "/status", { status: "Delivered" });
    if (!result.ok) { showToast("Could not update", "error"); return; }
    showToast("Order updated", "success");
    await loadClubOrders();
    renderOrders();
}

async function loadChat() {
    const sidebar = document.getElementById("chatSidebar");
    if (!sidebar) return;

    sidebar.innerHTML =
        '<div class="chat-sidebar-head">Team chat</div>' +
        '<div class="chat-box" id="chatBox"><div class="loading">Loading...</div></div>' +
        '<div class="chat-input-row">' +
            '<input id="chatInput" placeholder="Message the club..." onkeydown="if(event.key===\'Enter\'){sendChatMessage()}">' +
            '<button class="btn sm" onclick="sendChatMessage()">Send</button>' +
        '</div>';

    await refreshChat();
}

async function refreshChat() {
    try {
        const result = await apiGet("/ChatMessage/club/" + myClubId);
        chatMessages = Array.isArray(result) ? result : [];
        renderChatMessages();
    } catch (error) {
        console.error(error);
    }
}

function renderChatMessages() {
    const box = document.getElementById("chatBox");
    if (!box) return;

    if (chatMessages.length === 0) {
        box.innerHTML = '<div class="empty" style="margin:0;font-size:12px;padding:18px 10px">No messages yet — start the conversation.</div>';
        return;
    }

    box.innerHTML = chatMessages.map(function (msg) {
        const isMe = msg.userId === currentUser.userId;
        const name = escapeHtml(msg.senderName || ("User #" + msg.userId));
        const position = msg.senderPosition ? '<span class="chat-role-tag">' + escapeHtml(msg.senderPosition) + '</span>' : "";
        return '<div class="chat-msg">' +
            '<div class="chat-msg-head">' +
                '<b>' + (isMe ? "You" : name) + '</b>' +
                position +
                '<span class="chat-time">' + new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + '</span>' +
            '</div>' +
            '<div class="chat-msg-text">' + escapeHtml(msg.message) + '</div>' +
        '</div>';
    }).join("");

    box.scrollTop = box.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById("chatInput");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const body = {
        clubId: myClubId,
        userId: currentUser.userId,
        message: text
    };

    const result = await apiPost("/ChatMessage", body);
    if (!result.ok) { showToast("Could not send", "error"); return; }
    input.value = "";
    await refreshChat();
}