
import { auth, functions } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    httpsCallable
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-functions.js";

const getStudentFacilityIssues = httpsCallable(
    functions,
    "getStudentFacilityIssues"
);

const logoutButton = document.getElementById("logoutButton");
const trackMessage = document.getElementById("trackMessage");
const issuesContainer = document.getElementById("issuesContainer");

// ==========================================
// LOAD FACILITY ISSUES
// ==========================================

async function loadFacilityIssues() {

    trackMessage.textContent = "Loading facility issues...";
    issuesContainer.innerHTML = "";

    try {

        const result = await getStudentFacilityIssues();

        const issues = result.data.issues;

        if (!issues || issues.length === 0) {
            trackMessage.textContent =
                "No facility issues currently meet the minimum report threshold.";

            return;
        }

        trackMessage.textContent =
            `${issues.length} facility issue(s) found.`;

        issues.forEach((issue) => {

            const card = document.createElement("div");
            card.className = "dashboard-category";

            const title = document.createElement("h3");
            title.textContent = issue.title || "Facility Issue";

            const facility = document.createElement("p");
            facility.textContent =
                `Facility: ${issue.facility}`;

            const summary = document.createElement("p");
            summary.textContent =
                issue.summary || "No additional details available.";

            const reports = document.createElement("p");
            reports.textContent =
                `Reports received: ${issue.reportCount}`;

            const status = document.createElement("p");
            status.textContent =
                `Current Status: ${formatStatus(issue.status)}`;

            card.append(
                title,
                facility,
                summary,
                reports,
                status
            );

            issuesContainer.appendChild(card);
        });

    } catch (error) {

        console.error("Unable to load facility issues:", error);

        trackMessage.textContent =
            error.message ||
            "Unable to load facility issues. Please try again.";
    }
}

// ==========================================
// FORMAT ISSUE STATUS
// ==========================================

function formatStatus(status) {

    const statuses = {
        under_review: "Under Review",
        action_planned: "Action Planned",
        resolved: "Resolved"
    };

    return statuses[status] || "Status Unavailable";
}

// ==========================================
// AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, async function (user) {

    if (!user || !user.emailVerified) {
        window.location.href = "./login.html";
        return;
    }

    await loadFacilityIssues();
});

// ==========================================
// LOGOUT
// ==========================================

logoutButton.addEventListener("click", async function () {

    try {
        await signOut(auth);
        window.location.href = "./login.html";

    } catch (error) {
        alert("Unable to log out. Please try again.");
    }
});
