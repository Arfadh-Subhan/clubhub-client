let currentUser = null;
let clubId = null;
let club = null;
let clubEvents = [];
let clubPosts = [];
let clubProducts = [];
let clubAnnouncements = [];
let clubGalleries = [];
let galleryPhotosMap = {};
let clubMembers = [];

let editLogoBytes = null;
let editCoverBytes = null;

document.addEventListener("DOMContentLoaded", async function () {
    currentUser = requireLogin();
    if (!currentUser) return;

    if (currentUser.role !== "IcbtAdmin" && currentUser.role !== "SuperAdmin") {
        window.location.href = "student/dashboard.html";
        return;
    }

    const params = new URLSearchParams(window.location.search);
    clubId = Number(params.get("clubId"));

    if (!clubId) {
        window.location.href = "icbt-admin/dashboard.html?tab=societies";
        return;
    }

    bootstrapPage("");
    await loadEverything();
});

function switchManageTab(tabKey, button) {
    document.querySelectorAll("#manageTabStrip .club-tab").forEach(function (tab) {
        tab.classList.remove("active");
    });
    button.classList.add("active");

    document.querySelectorAll(".tab-pane").forEach(function (pane) {
        pane.style.display = "none";
    });

    const active = document.getElementById("tab-" + tabKey);
    if (active) active.style.display = "block";
}

async function loadEverything() {
    await loadClub();
    await Promise.all([
        loadMembers(),
        loadEvents(),
        loadPosts(),
        loadProducts(),
        loadAnnouncements(),
        loadGalleries()
    ]);
    renderHeader();
    renderAll();
}

async function loadClub() {
    try {
        club = await apiGet("/Club/" + clubId);
    } catch (error) { console.error(error); }
}

async function loadMembers() {
    try {
        const result = await apiGet("/ClubMember/club/" + clubId);
        clubMembers = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadEvents() {
    try {
        const result = await apiGet("/Event/club/" + clubId);
        clubEvents = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadPosts() {
    try {
        const result = await apiGet("/ClubPost/club/" + clubId);
        clubPosts = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadProducts() {
    try {
        const result = await apiGet("/ClubProduct/club/" + clubId);
        clubProducts = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadAnnouncements() {
    try {
        const result = await apiGet("/ClubAnnouncement/club/" + clubId);
        clubAnnouncements = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadGalleries() {
    try {
        const result = await apiGet("/ClubGallery/club/" + clubId);
        clubGalleries = Array.isArray(result) ? result : [];
        for (const gallery of clubGalleries) {
            try {
                const photos = await apiGet("/GalleryPhoto/gallery/" + gallery.clubGalleryId);
                galleryPhotosMap[gallery.clubGalleryId] = Array.isArray(photos) ? photos : [];
            } catch (error) { console.error(error); }
        }
    } catch (error) { console.error(error); }
}

function renderHeader() {
    const container = document.getElementById("clubHeader");
    if (!container || !club) return;

    const logoUri = decodeImage(club.logo);

    container.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:20px;flex-wrap:wrap;gap:16px">' +
            '<div style="display:flex;align-items:center;gap:16px">' +
                (logoUri
                    ? '<img src="' + logoUri + '" style="width:64px;height:64px;object-fit:contain;background:var(--panel-2);border-radius:var(--radius-sm);padding:8px">'
                    : '<div style="width:64px;height:64px;border-radius:var(--radius-sm);background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700">' + escapeHtml(club.name.charAt(0).toUpperCase()) + '</div>') +
                '<div>' +
                    '<div style="font-size:20px;font-weight:700">' + escapeHtml(club.name) + '</div>' +
                    '<div style="font-size:13px;color:var(--ink-soft);margin-top:2px">' + escapeHtml(club.category) + ' · Manage club</div>' +
                '</div>' +
            '</div>' +
            '<a class="btn-fill" href="icbt-admin/dashboard.html?tab=societies"><span class="btn-txt">Back to societies</span></a>' +
        '</div>';
}

function renderAll() {
    renderMembers();
    renderExecutives();
    renderEvents();
    renderPosts();
    renderProducts();
    renderAnnouncements();
    renderGallery();
    renderEditClub();
}

function renderMembers() {
    const container = document.getElementById("tab-members");
    if (!container) return;

    const memberList = clubMembers.filter(function (m) { return m.clubRole !== "Executive"; });

    let html =
        '<div class="section-head"><div><h2>Manage members</h2><div class="sub">Remove members from this club. Orders and history stay untouched.</div></div></div>';

    if (memberList.length === 0) {
        html += '<div class="empty">No members yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Name</th><th>Role</th><th>Joined</th><th></th></tr>';
    memberList.forEach(function (member) {
        html +=
            '<tr>' +
                '<td>' + escapeHtml(member.fullName) + '</td>' +
                '<td>' + escapeHtml(member.clubRole) + '</td>' +
                '<td>' + (member.joinedAt ? formatDate(member.joinedAt) : "—") + '</td>' +
                '<td><button class="btn danger sm" onclick="removeMember(' + member.clubMemberId + ', \'' + escapeHtml(member.fullName) + '\')">Remove</button></td>' +
            '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
}

async function removeMember(clubMemberId, name) {
    const clubName = club ? club.name : "the club";

    if (!confirm("Are you sure you want to remove " + name + " from " + clubName + "?")) return;

    const result = await apiDelete("/ClubMember/" + clubMemberId);
    if (!result.ok) { showToast("Could not remove member", "error"); return; }

    showToast("Member removed", "success");
    await loadMembers();
    renderMembers();
    renderExecutives();
}

function renderExecutives() {
    const container = document.getElementById("tab-executives");
    if (!container) return;

    const executiveList = clubMembers.filter(function (m) { return m.clubRole === "Executive"; });

    const positions = [
        "President", "Vice President", "Secretary", "Treasurer",
        "Head of Event Management", "Marketing Head", "Digital Creator",
        "Asst. Secretary", "Asst. Treasurer & Digital Creator",
        "Educational Resource Coordinator", "Academic Coordinator",
        "Non Academic Coordinator", "Social Media Manager"
    ];

    let html =
        '<div class="section-head"><div><h2>Manage executive</h2><div class="sub">Change positions or remove executives.</div></div></div>';

    if (executiveList.length === 0) {
        html += '<div class="empty">No executives yet. Add one from Add Executive tab.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Name</th><th>Position</th><th>Joined</th><th></th></tr>';
    executiveList.forEach(function (member) {
        let options = '<option value="">— No position —</option>';
        positions.forEach(function (pos) {
            const selected = member.position === pos ? " selected" : "";
            options += '<option value="' + escapeHtml(pos) + '"' + selected + '>' + escapeHtml(pos) + '</option>';
        });

        html +=
            '<tr>' +
                '<td>' + escapeHtml(member.fullName) + '</td>' +
                '<td>' +
                    '<select class="filter-select" style="padding:6px 12px;font-size:13px" onchange="updatePosition(' + member.clubMemberId + ', \'' + escapeHtml(member.fullName) + '\', this.value, \'' + escapeHtml(member.position || '') + '\')">' + options + '</select>' +
                '</td>' +
                '<td>' + (member.joinedAt ? formatDate(member.joinedAt) : "—") + '</td>' +
                '<td><button class="btn danger sm" onclick="removeExecutive(' + member.clubMemberId + ', \'' + escapeHtml(member.fullName) + '\')">Remove</button></td>' +
            '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
}

async function updatePosition(clubMemberId, name, position, oldPosition) {
    if (!position || position === oldPosition) return;

    const clubName = club ? club.name : "the club";

    if (!confirm("Are you sure you want to change " + name + "'s position to " + position + "?")) {
        await loadMembers();
        renderExecutives();
        return;
    }

    const result = await apiPut("/ClubMember/" + clubMemberId + "/position", { position: position });
    if (!result.ok) { showToast("Could not update position", "error"); return; }

    showToast("Position updated", "success");
    await loadMembers();
    renderExecutives();
}

async function removeExecutive(clubMemberId, name) {
    const clubName = club ? club.name : "the club";

    if (!confirm("Are you sure you want to remove " + name + " from " + clubName + "?")) return;

    const result = await apiDelete("/ClubMember/" + clubMemberId);
    if (!result.ok) { showToast("Could not remove executive", "error"); return; }

    showToast("Executive removed", "success");
    await loadMembers();
    renderExecutives();
    renderMembers();
}

function renderEvents() {
    const container = document.getElementById("tab-events");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Events</h2><div class="sub">Approved and pending events from this club. Read only.</div></div></div>';

    if (clubEvents.length === 0) {
        html += '<div class="empty">No events yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Name</th><th>Date</th><th>Venue</th><th>Status</th><th>Attending</th></tr>';
    clubEvents.forEach(function (eventItem) {
        let tagClass = "warn";
        if (eventItem.status === "Approved") tagClass = "good";
        if (eventItem.status === "Rejected") tagClass = "bad";

        html +=
            '<tr>' +
                '<td>' + escapeHtml(eventItem.name) + '</td>' +
                '<td>' + formatDate(eventItem.eventStartAt) + '</td>' +
                '<td>' + escapeHtml(eventItem.venue) + '</td>' +
                '<td><span class="tag ' + tagClass + '">' + escapeHtml(eventItem.status) + '</span></td>' +
                '<td>' + (eventItem.attendingCount || 0) + '</td>' +
            '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
}

function renderPosts() {
    const container = document.getElementById("tab-posts");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Posts</h2><div class="sub">Approved and pending posts from this club. Read only.</div></div></div>';

    if (clubPosts.length === 0) {
        html += '<div class="empty">No posts yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="grid">';
    clubPosts.forEach(function (post) {
        let tagClass = "warn";
        if (post.status === "Approved") tagClass = "good";
        if (post.status === "Rejected") tagClass = "bad";

        const coverUri = decodeImage(post.coverImage);

        html +=
            '<article class="card">' +
                (coverUri ? '<img class="post-photo post-photo-clickable" src="' + coverUri + '" alt="" onclick="event.stopPropagation(); openImageLightbox(\'' + coverUri + '\')">' : '') +
                '<span class="tag ' + tagClass + '">' + escapeHtml(post.status) + '</span>' +
                '<h4 style="margin-top:10px">' + escapeHtml(post.title) + '</h4>' +
                '<p class="desc">' + escapeHtml(post.description) + '</p>' +
            '</article>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderProducts() {
    const container = document.getElementById("tab-products");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Products</h2><div class="sub">Approved and pending products. Read only.</div></div></div>';

    if (clubProducts.length === 0) {
        html += '<div class="empty">No products yet.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap"><table><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr>';
    clubProducts.forEach(function (product) {
        let tagClass = "warn";
        if (product.status === "Approved") tagClass = "good";
        if (product.status === "Rejected") tagClass = "bad";

        html +=
            '<tr>' +
                '<td>' + escapeHtml(product.name) + '</td>' +
                '<td>' + escapeHtml(product.category) + '</td>' +
                '<td>Rs. ' + Number(product.price).toLocaleString() + '</td>' +
                '<td>' + product.stock + '</td>' +
                '<td><span class="tag ' + tagClass + '">' + escapeHtml(product.status) + '</span></td>' +
            '</tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
}

function renderAnnouncements() {
    const container = document.getElementById("tab-announcements");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Announcements</h2><div class="sub">Approved and pending announcements. Read only.</div></div></div>';

    if (clubAnnouncements.length === 0) {
        html += '<div class="empty">No announcements yet.</div>';
        container.innerHTML = html;
        return;
    }

    clubAnnouncements.forEach(function (announcement) {
        let tagClass = "warn";
        if (announcement.status === "Approved") tagClass = "good";
        if (announcement.status === "Rejected") tagClass = "bad";

        html +=
            '<div class="card" style="margin-bottom:12px">' +
                '<span class="tag ' + tagClass + '">' + escapeHtml(announcement.status) + '</span>' +
                '<h4 style="margin-top:10px">' + escapeHtml(announcement.title) + '</h4>' +
                '<p class="desc">' + escapeHtml(announcement.description) + '</p>' +
            '</div>';
    });
    container.innerHTML = html;
}

function renderGallery() {
    const container = document.getElementById("tab-gallery");
    if (!container) return;

    let html =
        '<div class="section-head"><div><h2>Gallery</h2><div class="sub">Photos from this club. Read only.</div></div></div>';

    if (clubGalleries.length === 0) {
        html += '<div class="empty">No galleries yet.</div>';
        container.innerHTML = html;
        return;
    }

    clubGalleries.forEach(function (gallery) {
        const photos = galleryPhotosMap[gallery.clubGalleryId] || [];
        if (photos.length === 0) return;

        const galleryCoverUri = decodeImage(gallery.coverPhoto);

        html +=
            '<div class="card" style="margin-bottom:16px">' +
                (galleryCoverUri ? '<img class="post-photo" src="' + galleryCoverUri + '" alt="">' : '') +
                '<h4>' + escapeHtml(gallery.title) + '</h4>' +
                '<p class="desc">' + escapeHtml(gallery.description) + '</p>' +
                '<div class="grid" style="margin-top:12px">' +
                    photos.map(function (photo) {
                        const uri = decodeImage(photo.photo);
                        return '<div style="border:1px solid var(--line);border-radius:8px;overflow:hidden">' +
                            '<img src="' + uri + '" class="gallery-photo-clickable" style="width:100%;height:120px;object-fit:cover;display:block" alt="" onclick="openImageLightbox(\'' + uri + '\')">' +
                            '<div style="padding:6px;font-size:11.5px">' + escapeHtml(photo.caption || "") + '</div>' +
                        '</div>';
                    }).join('') +
                '</div>' +
            '</div>';
    });

    if (html === '<div class="section-head"><div><h2>Gallery</h2><div class="sub">Photos from this club. Read only.</div></div></div>') {
        html += '<div class="empty">No photos uploaded yet.</div>';
    }

    container.innerHTML = html;
}

function renderEditClub() {
    const container = document.getElementById("tab-edit-club");
    if (!container || !club) return;

    const logoUri = decodeImage(club.logo);
    const coverUri = decodeImage(club.coverPhoto);

    container.innerHTML =
        '<div class="section-head"><div><h2>Edit club</h2><div class="sub">Update every detail of this club.</div></div></div>' +
        '<div class="login-panel" style="max-width:640px;margin:0 0 24px">' +
            '<div class="field"><label>Club name</label><input id="ecName" maxlength="100" value="' + escapeHtml(club.name) + '"></div>' +
            '<div class="field"><label>Category</label><input id="ecCategory" maxlength="50" value="' + escapeHtml(club.category) + '"></div>' +
            '<div class="field"><label>Description</label><textarea id="ecDescription" maxlength="1000">' + escapeHtml(club.description) + '</textarea></div>' +
            '<div class="field">' +
                '<label>Logo</label>' +
                '<img id="ecLogoPreview" class="photo-preview cs-logo-preview" ' + (logoUri ? 'src="' + logoUri + '" style="display:block"' : '') + '>' +
                buildDropZone("ecLogoInput", "image/*") +
            '</div>' +
            '<div class="field">' +
                '<label>Cover photo</label>' +
                '<img id="ecCoverPreview" class="photo-preview" ' + (coverUri ? 'src="' + coverUri + '" style="display:block"' : '') + '>' +
                buildDropZone("ecCoverInput", "image/*") +
            '</div>' +
            '<div id="ecMessage" class="alert hidden"></div>' +
            '<button class="btn full" onclick="submitEditClub()">Save changes</button>' +
        '</div>' +

        '<div class="danger-zone">' +
            '<svg class="danger-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>' +
                '<line x1="12" y1="9" x2="12" y2="13"></line>' +
                '<line x1="12" y1="17" x2="12.01" y2="17"></line>' +
            '</svg>' +
            '<div class="danger-zone-body">' +
                '<div class="danger-zone-title">Danger zone</div>' +
                '<p class="danger-zone-text">Deleting this club will permanently remove it and everything tied to it. This action cannot be undone.</p>' +
                '<button class="btn danger" onclick="openShutdownModal()">Shut down club</button>' +
            '</div>' +
        '</div>';

    bindEditFileInput("ecLogoInput", "ecLogoPreview", function (base64) { editLogoBytes = base64; });
    bindEditFileInput("ecCoverInput", "ecCoverPreview", function (base64) { editCoverBytes = base64; });
}

function bindEditFileInput(inputId, previewId, onCropped) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener("change", async function () {
        const file = this.files[0];
        if (!file) return;

        const isLogo = inputId === "ecLogoInput";
        const aspect = isLogo ? 1 : 16 / 9;
        const maxW = isLogo ? 512 : 1920;
        const maxH = isLogo ? 512 : 1080;

        const cropped = await openCropper(file, aspect, maxW, maxH);
        if (!cropped) return;

        onCropped(cropped.split(",")[1]);
        const preview = document.getElementById(previewId);
        preview.src = cropped;
        preview.style.display = "block";
    });
}

async function submitEditClub() {
    const message = document.getElementById("ecMessage");
    message.className = "alert hidden";
    message.textContent = "";

    const body = {
        name: document.getElementById("ecName").value.trim(),
        category: document.getElementById("ecCategory").value.trim(),
        description: document.getElementById("ecDescription").value.trim(),
        logo: editLogoBytes || club.logo || null,
        coverPhoto: editCoverBytes || club.coverPhoto || null
    };

    if (!body.name) {
        message.className = "alert bad";
        message.textContent = "Club name is required.";
        return;
    }

    if (!body.category) {
        message.className = "alert bad";
        message.textContent = "Category is required.";
        return;
    }

    if (!body.description) {
        message.className = "alert bad";
        message.textContent = "Description is required.";
        return;
    }

    if (!confirm("Save club changes?")) return;

    const result = await apiPut("/Club/" + clubId, body);

    if (!result.ok) {
        message.className = "alert bad";
        message.textContent = (result.data && result.data.message) ? result.data.message : "Could not save changes — name might already be taken.";
        return;
    }

    message.className = "alert good";
    message.textContent = "Club updated.";

    editLogoBytes = null;
    editCoverBytes = null;

    await loadClub();
    renderHeader();
    renderEditClub();
}

function openShutdownModal() {
    if (!club) return;

    const modalBg = document.createElement("div");
    modalBg.className = "modal-bg active";
    modalBg.id = "shutdownModal";
    modalBg.style.zIndex = "9998";

    modalBg.innerHTML =
        '<div class="shutdown-card" onclick="event.stopPropagation()">' +
            '<svg class="shutdown-icon" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M3 6h18"></path>' +
                '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
                '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>' +
                '<line x1="10" y1="11" x2="10" y2="17"></line>' +
                '<line x1="14" y1="11" x2="14" y2="17"></line>' +
            '</svg>' +
            '<div class="shutdown-title">Shut down ' + escapeHtml(club.name) + '?</div>' +
            '<p class="shutdown-desc">This will permanently delete the club and everything tied to it. This action cannot be undone.</p>' +
            '<div class="shutdown-actions">' +
                '<button type="button" class="btn outline" onclick="closeShutdownModal()">Cancel</button>' +
                '<button type="button" class="btn confirm-delete" onclick="confirmShutdown()">Delete club</button>' +
            '</div>' +
        '</div>';

    modalBg.addEventListener("click", closeShutdownModal);
    document.body.appendChild(modalBg);
}

function closeShutdownModal() {
    const modal = document.getElementById("shutdownModal");
    if (modal) modal.remove();
}

async function confirmShutdown() {
    if (!confirm("Confirm delete club?")) return;

    const result = await apiDelete("/Club/" + clubId);

    if (!result.ok) {
        const msg = (result.data && result.data.message) ? result.data.message : "Could not shut down club";
        showToast(msg, "error");
        return;
    }

    closeShutdownModal();
    showToast("Club shut down successfully", "success");

    setTimeout(function () {
        window.location.href = "icbt-admin/dashboard.html?tab=societies";
    }, 900);
}