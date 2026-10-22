# ClubHub - Client App

The frontend application for the ClubHub campus management platform. Built with **Vanilla JavaScript, HTML5, and CSS3** (no frameworks), it connects directly to the ClubHub REST API to deliver a fast, responsive experience.

##  Tech Stack
*   **HTML5** & **CSS3** (Custom Variables & Grid/Flexbox)
*   **Vanilla JavaScript** (ES6+)
*   **Cropper.js** (For image cropping and uploading)
*   **FontAwesome / Bootstrap Icons**

##  Key Features by Role
*   **Guests:** Browse public events, view club details, and read club galleries.
*   **Students:** Join clubs, RSVP to events, place merchandise orders, and request new clubs.
*   **Club Executives:** Propose events, schedule meetings, manage members, and use the club chat.
*   **ICBT Admins:** Approve/reject events and posts, manage users, create executives, and view analytics.
*   **Site Admins:** Full platform control, including account creation, password resets, and activity logs.

##  Getting Started
1. Clone the repository.
2. Ensure the [ClubHub Backend API](link-to-backend-repo) is running locally.
3. Open `js/common.js` and ensure `API_BASE_URL` points to your running backend (e.g., `http://localhost:5009/api`).
4. Open `index.html` in your browser, or use a local development server (like Live Server in VS Code).

##  Project Structure
*   `index.html` - Landing page
*   `pages/` - All sub-pages (Dashboards, Clubs, Events, etc.)
*   `js/` - JavaScript logic for all pages (modularized)
    *   `common.js` - Shared API calls, validation, and UI rendering
*   `css/` - `style.css` (Global theme) and `components.css` (Reusable UI)