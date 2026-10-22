let currentUser = null;
let club = null;
let clubId = null;
let clubEvents = [];
let clubPosts = [];
let clubAnnouncements = [];
let clubProducts = [];
let clubGalleries = [];
let galleryPhotosMap = {};
let myMembership = null;
let activeClubTab = null;

document.addEventListener("DOMContentLoaded", async function () {
    currentUser = getCurrentUser();
    bootstrapPage("clubs");

    const params = new URLSearchParams(window.location.search);
    clubId = params.get("clubId");

    if (!clubId) {
        document.getElementById("clubDetail").innerHTML =
            '<div class="empty">No club selected.</div>';
        return;
    }

    await loadClub();
});

async function loadClub() {
    try {
        club = await apiGet("/Club/" + clubId);
        if (!club) {
            document.getElementById("clubDetail").innerHTML =
                '<div class="empty">Club not found.</div>';
            return;
        }

        await Promise.all([
            loadEvents(),
            loadPosts(),
            loadAnnouncements(),
            loadProducts(),
            loadGalleries(),
            loadMembership()
        ]);

        activeClubTab = pickDefaultTab();
        render();
    } catch (error) {
        console.error(error);
        document.getElementById("clubDetail").innerHTML =
            '<div class="empty">Could not load club.</div>';
    }
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

async function loadAnnouncements() {
    if (!currentUser) { clubAnnouncements = []; return; }

    try {
        const result = await apiGet("/ClubMember/user/" + currentUser.userId);
        const memberships = Array.isArray(result) ? result : [];
        myMembership = memberships.find(function (m) {
            return m.clubId === Number(clubId);
        }) || null;

        if (!myMembership || myMembership.status !== "Approved") {
            clubAnnouncements = [];
            return;
        }

        const announcements = await apiGet("/ClubAnnouncement/club/" + clubId);
        clubAnnouncements = Array.isArray(announcements) ? announcements : [];
    } catch (error) {
        console.error(error);
        clubAnnouncements = [];
    }
}

async function loadProducts() {
    try {
        const result = await apiGet("/ClubProduct/club/" + clubId);
        clubProducts = Array.isArray(result) ? result : [];
    } catch (error) { console.error(error); }
}

async function loadGalleries() {
    try {
        const result = await apiGet("/ClubGallery/club/" + clubId);
        clubGalleries = Array.isArray(result) ? result : [];

        const withPhotos = [];
        for (const gallery of clubGalleries) {
            try {
                const photos = await apiGet("/GalleryPhoto/gallery/" + gallery.clubGalleryId);
                const photoList = Array.isArray(photos) ? photos : [];
                if (photoList.length > 0) {
                    galleryPhotosMap[gallery.clubGalleryId] = photoList;
                    withPhotos.push(gallery);
                }
            } catch (error) { console.error(error); }
        }
        clubGalleries = withPhotos;
    } catch (error) { console.error(error); }
}

async function loadMembership() {
    if (!currentUser) return;
    if (myMembership) return;

    try {
        const result = await apiGet("/ClubMember/user/" + currentUser.userId);
        if (Array.isArray(result)) {
            myMembership = result.find(function (membership) { return membership.clubId === Number(clubId); }) || null;
        }
    } catch (error) { console.error(error); }
}

function pickDefaultTab() {
    if (clubEvents.length > 0) return "events";
    if (clubPosts.length > 0) return "posts";
    if (clubProducts.length > 0) return "products";
    if (clubGalleries.length > 0) return "gallery";
    return null;
}

function hasAnyContent() {
    return clubEvents.length > 0
        || clubPosts.length > 0
        || clubProducts.length > 0
        || clubGalleries.length > 0;
}

function render() {
    const container = document.getElementById("clubDetail");

    const coverUri = decodeImage(club.coverPhoto);
    const logoUri = decodeImage(club.logo);

    let coverHtml = "";
    if (coverUri) {
        coverHtml = '<img src="' + coverUri + '" style="width:100%;height:220px;object-fit:cover;display:block;border-radius:14px 14px 0 0" alt="">';
    } else {
        coverHtml = '<div style="width:100%;height:220px;background:linear-gradient(135deg,#e8e7e3,#f3f2ee);border-radius:14px 14px 0 0"></div>';
    }

    let logoHtml = "";
    if (logoUri) {
        logoHtml = '<img src="' + logoUri + '" style="width:110px;height:110px;border-radius:50%;object-fit:cover;background:#fff;border:5px solid #fff;position:absolute;left:24px;bottom:-55px;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:2" alt="">';
    } else {
        logoHtml = '<div style="width:110px;height:110px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:700;border:5px solid #fff;position:absolute;left:24px;bottom:-55px;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:2">' + club.name.charAt(0).toUpperCase() + '</div>';
    }

    let action;
    if (!currentUser) {
        action = '<button class="btn" onclick="openLoginModal()">Log in to join</button>';
    } else if (!myMembership) {
        action = '<button class="btn" onclick="joinClub()">Request to join</button>';
    } else if (myMembership.status === "Approved") {
        action = '<span class="tag good">Already joined</span>';
    } else if (myMembership.status === "Pending") {
        action = '<span class="tag warn">Requested</span>';
    } else if (myMembership.status === "Rejected") {
        action = '<button class="btn" onclick="joinClub()">Re-request</button>';
    }

    let html =
        '<div class="card" style="padding:0;overflow:visible;margin-bottom:32px;border-radius:14px">' +
            '<div style="position:relative">' +
                coverHtml +
                logoHtml +
            '</div>' +
            '<div style="padding:70px 24px 24px">' +
                '<span class="tag">' + escapeHtml(club.category) + '</span>' +
                '<h2 style="margin-top:10px">' + escapeHtml(club.name) + '</h2>' +
                '<p style="font-size:15px;line-height:1.6;margin-top:10px;color:var(--ink-soft)">' + escapeHtml(club.description) + '</p>' +
                '<div style="margin-top:16px">' + action + '</div>' +
            '</div>' +
        '</div>';

    if (clubAnnouncements.length > 0) {
        html += '<div class="section-head" style="margin-bottom:12px"><h2 style="font-size:17px">Announcements</h2></div>';
        html += '<div style="margin-bottom:32px">';
        clubAnnouncements.forEach(function (announcement) {
            html += '<div class="announce-card"><b>' + escapeHtml(announcement.title) + '</b><br>' + escapeHtml(announcement.description) + '</div>';
        });
        html += '</div>';
    }

    if (!hasAnyContent()) {
        html += '<div class="empty">Nothing to show yet — check back soon.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="club-tab-strip" id="clubDetailTabs">';
    if (clubEvents.length > 0) {
        html += '<button class="club-tab' + (activeClubTab === "events" ? " active" : "") + '" onclick="switchClubTab(\'events\', this)">Events</button>';
    }
    if (clubPosts.length > 0) {
        html += '<button class="club-tab' + (activeClubTab === "posts" ? " active" : "") + '" onclick="switchClubTab(\'posts\', this)">Posts</button>';
    }
    if (clubProducts.length > 0) {
        html += '<button class="club-tab' + (activeClubTab === "products" ? " active" : "") + '" onclick="switchClubTab(\'products\', this)">Products</button>';
    }
    if (clubGalleries.length > 0) {
        html += '<button class="club-tab' + (activeClubTab === "gallery" ? " active" : "") + '" onclick="switchClubTab(\'gallery\', this)">Gallery</button>';
    }
    html += '</div>';

    html += '<div id="clubTabContent"></div>';

    container.innerHTML = html;
    renderActiveTab();
}

function switchClubTab(tabKey, button) {
    activeClubTab = tabKey;

    document.querySelectorAll("#clubDetailTabs .club-tab").forEach(function (tab) {
        tab.classList.remove("active");
    });
    button.classList.add("active");

    renderActiveTab();
}

function renderActiveTab() {
    const container = document.getElementById("clubTabContent");
    if (!container) return;

    if (activeClubTab === "events") {
        container.innerHTML = renderEventsSection();
    } else if (activeClubTab === "posts") {
        container.innerHTML = renderPostsSection();
    } else if (activeClubTab === "products") {
        container.innerHTML = renderProductsSection();
    } else if (activeClubTab === "gallery") {
        container.innerHTML = renderGallerySection();
    } else {
        container.innerHTML = "";
    }
}

function renderEventsSection() {
    let html = '<div class="grid" id="clubGrid">';
    clubEvents.forEach(function (eventItem) {
        const posterUri = decodeImage(eventItem.poster);
        const logoBlock = posterUri
            ? '<img src="' + posterUri + '" alt="' + escapeHtml(eventItem.name) + '">'
            : '<div class="initial">' + escapeHtml(eventItem.name.charAt(0).toUpperCase()) + '</div>';

        const eventDate = formatDate(eventItem.eventStartAt) + ' · ' + escapeHtml(eventItem.venue);
        const eventUrl = 'event-detail.html?eventId=' + eventItem.eventId + '&from=club&clubId=' + clubId;

        html +=
            '<div class="club-card-u" onclick="window.location.href=\'' + eventUrl + '\'">' +
                '<span class="tag">Event</span>' +
                '<div class="wrapper">' +
                    '<div class="card-image">' + logoBlock + '</div>' +
                    '<div class="content">' +
                        '<p class="title">' + escapeHtml(eventItem.name) + '</p>' +
                        '<p class="sub">' + eventDate + '</p>' +
                    '</div>' +
                    '<button class="card-btn" onclick="event.stopPropagation(); window.location.href=\'' + eventUrl + '\'">View event</button>' +
                '</div>' +
            '</div>';
    });
    html += '</div>';
    return html;
}

function renderPostsSection() {
    let html = '<div class="grid">';
    clubPosts.forEach(function (post) {
        const postCoverUri = decodeImage(post.coverImage);
        html +=
            '<article class="card">' +
                (postCoverUri ? '<img class="post-photo post-photo-clickable" src="' + postCoverUri + '" alt="" onclick="event.stopPropagation(); openImageLightbox(\'' + postCoverUri + '\')">' : '') +
                '<h4>' + escapeHtml(post.title) + '</h4>' +
                '<p class="desc">' + escapeHtml(post.description) + '</p>' +
            '</article>';
    });
    html += '</div>';
    return html;
}

function renderProductsSection() {
    let html = '<div class="grid">';
    clubProducts.forEach(function (product) {
        const imgUri = decodeImage(product.image);
        const logoBlock = imgUri
            ? '<img src="' + imgUri + '" alt="' + escapeHtml(product.name) + '">'
            : '<div class="initial">' + escapeHtml(product.name.charAt(0).toUpperCase()) + '</div>';

        const productUrl = 'product-detail.html?productId=' + product.clubProductId + '&clubId=' + clubId;
        const priceLine = 'Rs. ' + Number(product.price).toLocaleString() + ' · Stock ' + product.stock;

        html +=
            '<div class="club-card-u" onclick="window.location.href=\'' + productUrl + '\'">' +
                '<span class="tag">' + escapeHtml(product.category) + '</span>' +
                '<div class="wrapper">' +
                    '<div class="card-image">' + logoBlock + '</div>' +
                    '<div class="content">' +
                        '<p class="title">' + escapeHtml(product.name) + '</p>' +
                        '<p class="sub">' + priceLine + '</p>' +
                    '</div>' +
                    '<button class="card-btn" onclick="event.stopPropagation(); window.location.href=\'' + productUrl + '\'">View product</button>' +
                '</div>' +
            '</div>';
    });
    html += '</div>';
    return html;
}

function renderGallerySection() {
    let html = '';
    clubGalleries.forEach(function (gallery) {
        const photos = galleryPhotosMap[gallery.clubGalleryId] || [];
        if (photos.length === 0) return;

        const galleryCoverUri = decodeImage(gallery.coverPhoto);

        html +=
            '<div class="card" style="margin-bottom:16px">' +
                (galleryCoverUri ? '<img class="post-photo" src="' + galleryCoverUri + '" alt="">' : '') +
                '<h4>' + escapeHtml(gallery.title) + '</h4>' +
                '<p class="desc">' + escapeHtml(gallery.description || "") + '</p>' +
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

    if (html === '') {
        html = '<div class="empty">No photos uploaded yet.</div>';
    }

    return html;
}

async function joinClub() {
    if (!currentUser) { openLoginModal(); return; }

    if (!confirm("Confirm join request?")) return;

    const body = { clubId: Number(clubId), userId: currentUser.userId };
    const result = await apiPost("/ClubMember/join", body);

    if (!result.ok) {
        showToast((result.data && result.data.message) ? result.data.message : "Could not send request.", "error");
        return;
    }

    showToast("Request sent — the board will review it", "success");
    await loadMembership();
    render();
}