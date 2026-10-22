document.addEventListener("DOMContentLoaded", function () {
    bootstrapPage("");
    loadUpcomingEvents();
    loadClubs();
});

// -- Load upcoming events

async function loadUpcomingEvents() {
    const container = document.getElementById("upcomingEvents");
    if (!container) return;

    try {
        const result = await apiGet("/Event?pageNumber=1&pageSize=3");

        if (!result || !result.items || result.items.length === 0) {
            container.innerHTML = '<div class="empty">No upcoming events yet. Check back soon.</div>';
            return;
        }

        let html = "";
        result.items.forEach(function (eventItem) {
            html += eventCardHtml(eventItem);
        });
        container.innerHTML = html;
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="empty">Could not load events.</div>';
    }
}

// -- Load clubs

async function loadClubs() {
    const container = document.getElementById("clubGrid");
    if (!container) return;

    try {
        const result = await apiGet("/Club?pageNumber=1&pageSize=6");

        if (!result || !result.items || result.items.length === 0) {
            container.innerHTML = '<div class="empty">No clubs yet. Check back soon.</div>';
            return;
        }

        let html = "";
        result.items.forEach(function (club) {
            html += clubCardHtml(club);
        });
        container.innerHTML = html;
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="empty">Could not load clubs.</div>';
    }
}

// -- Event card html

function eventCardHtml(eventItem) {
    const clubName = eventItem.clubId ? "Club #" + eventItem.clubId : "Campus-wide";
    const initial = clubName.charAt(0).toUpperCase();
    const dateText = formatDate(eventItem.eventStartAt);
    const posterUri = decodeImage(eventItem.poster);

    let posterHtml;
    if (posterUri) {
        posterHtml = '<img class="ig-post-photo" src="' + posterUri + '" alt="' + escapeHtml(eventItem.name) + '">';
    } else {
        posterHtml = '<div class="ig-post-photo" style="display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px;background:#2A2A2A">' + escapeHtml(eventItem.name) + '</div>';
    }

    return (
        '<article class="ig-post">' +
            '<div class="ig-post-head">' +
                '<div class="ig-avatar">' + initial + '</div>' +
                '<div>' +
                    '<div class="ig-post-club">' + escapeHtml(clubName) + '</div>' +
                    '<div class="ig-post-meta">' + dateText + ' · ' + escapeHtml(eventItem.venue) + '</div>' +
                '</div>' +
            '</div>' +
            posterHtml +
            '<div class="ig-actions">' +
                '<span class="rsvp-count" style="margin-left:auto">' + (eventItem.attendingCount || 0) + ' attending</span>' +
            '</div>' +
            '<div class="ig-caption"><b>' + escapeHtml(eventItem.name) + '</b><br>' + escapeHtml(eventItem.description) + '</div>' +
            '<div class="ig-meta">' + escapeHtml(eventItem.eventTime || "") + ' · ' + escapeHtml(eventItem.venue) + '</div>' +
        '</article>'
    );
}

// -- Club card html

function clubCardHtml(club) {
    const logoUri = decodeImage(club.logo);
    const logoBlock = logoUri
        ? '<img src="' + logoUri + '" alt="' + escapeHtml(club.name) + '">'
        : '<div class="initial">' + escapeHtml(club.name.charAt(0).toUpperCase()) + '</div>';

    const target = 'pages/club-detail.html?clubId=' + club.clubId;

    return (
        '<div class="club-card-u" onclick="window.location.href=\'' + target + '\'">' +
            '<span class="tag">' + escapeHtml(club.category) + '</span>' +
            '<div class="wrapper">' +
                '<div class="card-image">' + logoBlock + '</div>' +
                '<div class="content">' +
                    '<p class="title">' + escapeHtml(club.name) + '</p>' +
                    '<p class="sub">' + escapeHtml(club.description) + '</p>' +
                '</div>' +
                '<button class="card-btn" onclick="event.stopPropagation(); window.location.href=\'' + target + '\'">View club</button>' +
            '</div>' +
        '</div>'
    );
}