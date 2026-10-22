let allClubs = [];
let myMemberships = [];

document.addEventListener("DOMContentLoaded", function () {
    bootstrapPage("clubs");
    loadPage();
    wireSearch();
});

async function loadPage() {
    await loadMyStatus();
    await loadClubs();
    loadPulseForUser(getCurrentUser());
}

async function loadMyStatus() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const memberships = await apiGet("/ClubMember/user/" + user.userId);
        myMemberships = Array.isArray(memberships) ? memberships : [];
    } catch (error) {
        console.error(error);
    }
}

async function loadClubs() {
    const container = document.getElementById("clubGrid");
    if (!container) return;

    try {
        const result = await apiGet("/Club?pageNumber=1&pageSize=100");
        allClubs = (result && result.items) ? result.items : [];
        renderGrid();
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="empty">Could not load clubs.</div>';
    }
}

function renderGrid() {
    const container = document.getElementById("clubGrid");
    if (!container) return;

    const search = (document.getElementById("clubSearch").value || "").toLowerCase();

    let list = allClubs.slice();

    if (search) {
        list = list.filter(function (club) {
            return club.name.toLowerCase().includes(search) ||
                   club.category.toLowerCase().includes(search) ||
                   club.description.toLowerCase().includes(search);
        });
    }

    if (list.length === 0) {
        container.innerHTML = '<div class="empty">No clubs match your search.</div>';
        return;
    }

    let html = "";
    list.forEach(function (club) {
        html += clubCardHtml(club);
    });
    container.innerHTML = html;
}

function clubCardHtml(club) {
    const membership = myMemberships.find(function (m) { return m.clubId === club.clubId; });

    const logoUri = decodeImage(club.logo);
    const logoBlock = logoUri
        ? '<img src="' + logoUri + '" alt="' + escapeHtml(club.name) + '">'
        : '<div class="initial">' + escapeHtml(club.name.charAt(0).toUpperCase()) + '</div>';

    let btnLabel = "Request to join";
    let btnDisabled = false;

    if (membership) {
        if (membership.status === "Approved") {
            btnLabel = "Already joined";
            btnDisabled = true;
        } else if (membership.status === "Pending") {
            btnLabel = "Requested";
            btnDisabled = true;
        } else if (membership.status === "Rejected") {
            btnLabel = "Re-request";
        }
    }

    return (
        '<div class="club-card-u" onclick="openClub(' + club.clubId + ')">' +
            '<span class="tag">' + escapeHtml(club.category) + '</span>' +
            '<div class="wrapper">' +
                '<div class="card-image">' + logoBlock + '</div>' +
                '<div class="content">' +
                    '<p class="title">' + escapeHtml(club.name) + '</p>' +
                    '<p class="sub">' + escapeHtml(club.description) + '</p>' +
                '</div>' +
                '<button class="card-btn" ' + (btnDisabled ? 'disabled' : '') + ' onclick="event.stopPropagation(); ' + (btnDisabled ? '' : 'joinClub(' + club.clubId + ')') + '">' + btnLabel + '</button>' +
            '</div>' +
        '</div>'
    );
}

function openClub(clubId) {
    window.location.href = "club-detail.html?clubId=" + clubId;
}

async function joinClub(clubId) {
    const user = getCurrentUser();

    if (!user) {
        openLoginModal();
        return;
    }

    if (!confirm("Confirm join request?")) return;

    const body = {
        clubId: clubId,
        userId: user.userId
    };

    const result = await apiPost("/ClubMember/join", body);

    if (!result.ok) {
        showToast((result.data && result.data.message) ? result.data.message : "Could not send request.", "error");
        return;
    }

    showToast("Request sent — the board will review it", "success");
    await loadMyStatus();
    renderGrid();
}

function wireSearch() {
    const search = document.getElementById("clubSearch");
    if (search) search.addEventListener("input", renderGrid);
}