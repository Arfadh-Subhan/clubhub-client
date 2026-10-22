let currentUser = null;
let product = null;
let clubName = "Club";
let clubId = null;
let productId = null;

document.addEventListener("DOMContentLoaded", async function () {
    currentUser = getCurrentUser();
    bootstrapPage("");

    const params = new URLSearchParams(window.location.search);
    productId = params.get("productId");
    const from = params.get("from") || "club";
    const clubParam = params.get("clubId");

    if (!productId) {
        document.getElementById("productDetail").innerHTML =
            '<div class="empty">No product selected.</div>';
        return;
    }

    await loadProduct(productId, clubParam);
});

async function loadProduct(id, clubParam) {
    const container = document.getElementById("productDetail");
    if (container) {
        renderEventSkeletons(container, 2);
    }

    try {
        product = await apiGet("/ClubProduct/" + id);

        if (!product) {
            if (container) {
                container.innerHTML = '<div class="empty">Product not found.</div>';
            }
            return;
        }

        clubId = product.clubId;

        try {
            const club = await apiGet("/Club/" + clubId);
            if (club) clubName = club.name;
        } catch (error) { console.error(error); }

        render();
    } catch (error) {
        console.error(error);
        if (container) {
            container.innerHTML = '<div class="empty">Could not load product.</div>';
        }
    }
}

function render() {
    const container = document.getElementById("productDetail");
    const imgUri = decodeImage(product.image);
    const initial = clubName.charAt(0).toUpperCase();

    let imgHtml = "";
    if (imgUri) {
        imgHtml = '<img src="' + imgUri + '" style="width:100%;max-height:520px;object-fit:contain;background:var(--panel);border-radius:14px;display:block" alt="' + escapeHtml(product.name) + '">';
    } else {
        imgHtml = '<div style="width:100%;aspect-ratio:1;background:var(--panel-2);color:var(--ink-faint);display:flex;align-items:center;justify-content:center;border-radius:14px;font-size:64px;font-weight:700">' + escapeHtml(product.name.charAt(0).toUpperCase()) + '</div>';
    }

    let statusTag = "";
    if (product.status === "Pending") statusTag = '<span class="tag warn">Pending approval</span>';
    if (product.status === "Rejected") statusTag = '<span class="tag bad">Rejected</span>';
    if (product.status === "Approved") statusTag = '<span class="tag good">Approved</span>';

    const isReviewer = currentUser && (currentUser.role === "IcbtAdmin" || currentUser.role === "SuperAdmin");
    const showReviewButtons = isReviewer && product.status === "Pending";

    let reviewHtml = "";
    if (showReviewButtons) {
        reviewHtml =
            '<div style="border-top:1px solid var(--line);padding-top:20px;margin-top:24px">' +
                '<div class="sub" style="font-size:13px;color:var(--ink-soft);margin-bottom:12px">Review this product submission</div>' +
                '<div class="card-actions">' +
                    '<button class="btn good" onclick="approveProduct()">Approve</button>' +
                    '<button class="btn danger" onclick="rejectProduct()">Reject</button>' +
                '</div>' +
            '</div>';
    }

    let orderHtml = "";
    if (product.status === "Approved" && product.stock > 0) {
        orderHtml = '<button class="btn" onclick="openOrderModal()">Order now</button>';
    } else if (product.stock <= 0) {
        orderHtml = '<button class="btn" disabled>Out of stock</button>';
    }

    container.innerHTML =
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:flex-start" class="product-layout">' +
            '<div>' +
                imgHtml +
            '</div>' +
            '<div>' +
                '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
                    '<div class="ig-avatar">' + initial + '</div>' +
                    '<div>' +
                        '<div class="ig-post-club">' + escapeHtml(clubName) + '</div>' +
                        '<div class="ig-post-meta">' + escapeHtml(product.category) + '</div>' +
                    '</div>' +
                '</div>' +
                '<h2 style="margin-top:8px">' + escapeHtml(product.name) + '</h2>' +
                statusTag +
                '<div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;margin:20px 0 6px">Rs. ' + Number(product.price).toLocaleString() + '</div>' +
                '<div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:20px">Stock: ' + product.stock + '</div>' +
                '<div class="card-plain" style="margin-bottom:24px">' +
                    '<p style="font-size:15px;line-height:1.7;color:var(--ink-soft);white-space:pre-wrap">' + escapeHtml(product.description) + '</p>' +
                '</div>' +
                '<div class="card-actions">' +
                    orderHtml +
                '</div>' +
                reviewHtml +
            '</div>' +
        '</div>';

    if (!document.getElementById("productLayoutStyles")) {
        const style = document.createElement("style");
        style.id = "productLayoutStyles";
        style.textContent = "@media (max-width: 900px) { .product-layout { grid-template-columns: 1fr !important; } }";
        document.head.appendChild(style);
    }
}

function openOrderModal() {
    if (!currentUser) { openLoginModal(); return; }
    if (!product || product.status !== "Approved") return;

    openModal(
        '<h3>Order — ' + escapeHtml(product.name) + '</h3>' +
        '<div class="meta" style="margin-bottom:14px">Rs. ' + Number(product.price).toLocaleString() + ' each · Stock ' + product.stock + '</div>' +
        '<div class="field"><label>Quantity</label><input id="orderQty" type="number" min="1" max="' + product.stock + '" value="1"></div>' +
        '<div class="field"><label>Student ID</label><input id="orderStudentId" maxlength="20"></div>' +
        '<div class="field"><label>Full name</label><input id="orderFullName" maxlength="100"></div>' +
        '<div class="field"><label>Phone</label><input id="orderPhone" maxlength="15"></div>' +
        '<div class="field"><label>Email</label><input id="orderEmail" type="email" maxlength="100"></div>' +
        '<button class="btn full" onclick="submitOrder()">Place order</button>'
    );

    document.getElementById("orderStudentId").value = currentUser.studentId || "";
    document.getElementById("orderFullName").value = currentUser.fullName || "";
    document.getElementById("orderPhone").value = currentUser.phoneNumber || "";
    document.getElementById("orderEmail").value = currentUser.email || "";
}

async function submitOrder() {
    if (!currentUser) { openLoginModal(); return; }

    const quantity = Number(document.getElementById("orderQty").value) || 1;
    const studentId = document.getElementById("orderStudentId").value.trim();
    const fullName = document.getElementById("orderFullName").value.trim();
    const phoneNumber = document.getElementById("orderPhone").value.trim();
    const email = document.getElementById("orderEmail").value.trim();

    if (!studentId || !fullName || !phoneNumber || !email) {
        showToast("Fill in all fields", "error");
        return;
    }

    if (!confirm("Confirm order?")) return;

    const body = {
        clubProductId: product.clubProductId,
        userId: currentUser.userId,
        quantity: quantity,
        studentId: studentId,
        fullName: fullName,
        phoneNumber: phoneNumber,
        email: email
    };

    const result = await apiPost("/Order", body);

    if (!result.ok) {
        showToast((result.data && result.data.message) ? result.data.message : "Could not place order", "error");
        return;
    }

    closeModal();
    showToast("Order placed successfully", "success");
    await loadProduct(product.clubProductId);
}

async function approveProduct() {
    if (!currentUser) { openLoginModal(); return; }

    if (!confirm("Approve this product?")) return;

    const result = await apiPut("/ClubProduct/" + product.clubProductId + "/approve", { reviewedBy: currentUser.userId });

    if (!result.ok) { showToast("Could not approve", "error"); return; }

    showToast("Product approved", "success");
    await loadProduct(product.clubProductId);
}

async function rejectProduct() {
    if (!currentUser) { openLoginModal(); return; }

    const reason = prompt("Rejection reason:");
    if (reason === null) return;

    if (!confirm("Reject this product?")) return;

    const result = await apiPut("/ClubProduct/" + product.clubProductId + "/reject", {
        reviewedBy: currentUser.userId,
        rejectionReason: reason || "No reason provided."
    });

    if (!result.ok) { showToast("Could not reject", "error"); return; }

    showToast("Product rejected", "success");
    await loadProduct(product.clubProductId);
}