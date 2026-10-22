let currentUser = null;
let post = null;
let clubName = "Club";
let isAdminView = false;

document.addEventListener("DOMContentLoaded", async function () {
    currentUser = getCurrentUser();
    bootstrapPage("");

    const params = new URLSearchParams(window.location.search);
    const postId = params.get("postId");
    const from = params.get("from");

    if (from === "admin") {
        isAdminView = true;
    }

    if (!postId) {
        document.getElementById("postDetail").innerHTML =
            '<div class="empty">No post selected.</div>';
        return;
    }

    await loadPost(postId);
});

async function loadPost(id) {
    const container = document.getElementById("postDetail");

    try {
        post = await apiGet("/ClubPost/" + id);

        if (!post) {
            container.innerHTML = '<div class="empty">Post not found.</div>';
            return;
        }

        try {
            const club = await apiGet("/Club/" + post.clubId);
            if (club) clubName = club.name;
        } catch (error) { console.error(error); }

        render();
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="empty">Could not load post.</div>';
    }
}

function render() {
    const container = document.getElementById("postDetail");
    const coverUri = decodeImage(post.coverImage);

    let coverHtml = "";
    if (coverUri) {
        coverHtml = '<img src="' + coverUri + '" style="width:100%;max-height:400px;object-fit:cover;border-radius:14px;margin-bottom:24px" alt="">';
    }

    let statusTag = "";
    if (post.status === "Pending") statusTag = '<span class="tag warn">Pending approval</span>';
    if (post.status === "Rejected") statusTag = '<span class="tag bad">Rejected</span>';
    if (post.status === "Approved") statusTag = '<span class="tag good">Approved</span>';

    const linksHtml = buildDetailLinksHtml(post.links);

    let adminActionsHtml = "";
    if (isAdminView && currentUser && (currentUser.role === "IcbtAdmin" || currentUser.role === "SuperAdmin")) {
        adminActionsHtml = 
            '<div class="card-plain" style="margin-bottom:24px; background:var(--panel-2); border:1px solid var(--line)">' +
                '<h4 style="margin-bottom:12px">Admin Review</h4>' +
                '<div class="card-actions">' +
                    (post.status === "Pending" 
                        ? '<button class="btn good" onclick="adminApprove()">Approve</button>' +
                          '<button class="btn danger" onclick="adminReject()">Reject</button>'
                        : '<span class="tag ' + (post.status === "Approved" ? "good" : "bad") + '">Already ' + escapeHtml(post.status) + '</span>') +
                    '<a href="../../pages/icbt-admin/dashboard.html?tab=approvals" class="btn outline" style="margin-left:auto">Back to Approvals</a>' +
                '</div>' +
            '</div>';
    }

    container.innerHTML =
        coverHtml +
        '<div class="section-head">' +
            '<div>' +
                '<div class="ig-post-meta" style="margin-bottom:8px">' + escapeHtml(clubName) + '</div>' +
                '<h2>' + escapeHtml(post.title) + '</h2>' +
                statusTag +
            '</div>' +
        '</div>' +

        adminActionsHtml +

        '<div class="card-plain" style="margin-bottom:24px">' +
            '<p style="font-size:15px;line-height:1.65;color:var(--ink-soft);white-space:pre-wrap">' + escapeHtml(post.description) + '</p>' +
        '</div>' +

        linksHtml;
}

function buildDetailLinksHtml(links) {
    if (!links) return "";
    const lines = links.split("\n").map(function (line) { return line.trim(); }).filter(function (line) { return line.length > 0; });
    if (lines.length === 0) return "";

    let inner = '<div class="card-plain" style="margin-bottom:24px"><div class="meta" style="margin-bottom:10px">Links</div>';
    lines.forEach(function (line) {
        inner += '<div class="ig-detail-row"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><a href="' + escapeHtml(line) + '" target="_blank" rel="noopener">' + escapeHtml(line) + '</a></div>';
    });
    inner += '</div>';
    return inner;
}

async function adminApprove() {
    if (!confirm("Approve this post?")) return;
    
    const result = await apiPut("/ClubPost/" + post.clubPostId + "/approve", { reviewedBy: currentUser.userId });
    if (!result.ok) { showToast("Could not approve", "error"); return; }
    showToast("Post approved successfully", "success");
    
    setTimeout(function() {
        window.location.href = "icbt-admin/dashboard.html?tab=approvals";
    }, 1000);
}

async function adminReject() {
    const reason = prompt("Rejection reason:");
    if (reason === null) return;
    if (!confirm("Reject this post?")) return;

    const result = await apiPut("/ClubPost/" + post.clubPostId + "/reject", { 
        reviewedBy: currentUser.userId, 
        rejectionReason: reason || "No reason provided." 
    });
    
    if (!result.ok) { showToast("Could not reject", "error"); return; }
    showToast("Post rejected", "success");
    
    setTimeout(function() {
        window.location.href = "icbt-admin/dashboard.html?tab=approvals";
    }, 1000);
}