
import { auth, functions } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    httpsCallable
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-functions.js";

const studentName = document.getElementById("studentName");
const logoutButton = document.getElementById("logoutButton");

// Account notice elements
const accountNoticeSection = document.getElementById("accountNoticeSection");
const noticeMessage = document.getElementById("noticeMessage");
const noticeAction = document.getElementById("noticeAction");
const noticeCategory = document.getElementById("noticeCategory");
const noticeReason = document.getElementById("noticeReason");
const noticeDate = document.getElementById("noticeDate");
const noticeStatus = document.getElementById("noticeStatus");
const noticeExpiryRow = document.getElementById("noticeExpiryRow");
const noticeExpiry = document.getElementById("noticeExpiry");
const appealStatus = document.getElementById("appealStatus");
const suspensionBlockMessage = document.getElementById("suspensionBlockMessage");
const feedbackLinks = document.querySelectorAll(
    ".dashboard-category a[href^='feedback.html']"
);

const appealForm = document.getElementById("appealForm");
const appealExplanation = document.getElementById("appealExplanation");
const submitAppealButton = document.getElementById("submitAppealButton");
const appealMessage = document.getElementById("appealMessage");
let currentSanctionId = null;

// Backend functions
const getMyAccountNotice = httpsCallable(functions, "getMyAccountNotice");
const submitSanctionAppeal = httpsCallable(functions, "submitSanctionAppeal");

// Load student's account notice
async function loadAccountNotice() {

    try {

        const result = await getMyAccountNotice();
        const notice = result.data;

       if (!notice || !notice.hasNotice) {
    accountNoticeSection.hidden = true;
    suspensionBlockMessage.hidden = true;

    feedbackLinks.forEach(link => {
        link.style.pointerEvents = "auto";
        link.style.opacity = "1";
        link.textContent = "Share Feedback →";
    });

    return;
}

        accountNoticeSection.hidden = false;
        currentSanctionId = notice.sanctionId;
        const isSuspended =
    notice.action === "suspend_7d" &&
    notice.suspensionActive === true;

suspensionBlockMessage.hidden = !isSuspended;

feedbackLinks.forEach(link => {
    link.style.pointerEvents = isSuspended ? "none" : "auto";
    link.style.opacity = isSuspended ? "0.5" : "1";
    link.textContent = isSuspended
        ? "Temporarily unavailable"
        : "Share Feedback →";
});

        noticeMessage.textContent =
    notice.action === "suspend_7d"
        ? notice.suspensionActive
            ? "Your account is temporarily suspended from submitting feedback until the expiry date shown below."
            : "Your 7-day suspension has expired. You can submit feedback again."
        : "A warning has been issued to your account.";

        noticeAction.textContent = notice.action || "Not available";
        noticeCategory.textContent = notice.category || "Not available";
        noticeReason.textContent = notice.reason || "Not available";

        noticeDate.textContent = notice.issuedAt
    ? new Date(notice.issuedAt).toLocaleString()
    : "Not available";

        noticeStatus.textContent = notice.status || "Not available";
        appealStatus.textContent = notice.appealStatus || "Not submitted";
        if (notice.action === "suspend_7d" && notice.expiresAt) {
    noticeExpiryRow.hidden = false;
    noticeExpiry.textContent =
        new Date(notice.expiresAt).toLocaleString();
} else {
    noticeExpiryRow.hidden = true;
}

        // Allow appeals only for active sanctions without a pending or reversed appeal
        if (
            notice.status === "active" &&
            notice.appealStatus !== "pending" &&
            notice.appealStatus !== "reversed"
        ) {
            appealForm.hidden = false;
        } else {
            appealForm.hidden = true;
        }

    } catch (error) {

        console.error("Account notice error:", error);
        accountNoticeSection.hidden = true;

    }

}

// Submit an appeal
submitAppealButton.addEventListener("click", async function () {

    const explanation = appealExplanation.value.trim();

    if (explanation.length < 20 || explanation.length > 1000) {
        appealMessage.textContent =
            "Your explanation must contain between 20 and 1000 characters.";
        return;
    }

    submitAppealButton.disabled = true;
    appealMessage.textContent = "Submitting your appeal...";

    try {

        await submitSanctionAppeal({
    sanctionId: currentSanctionId,
    explanation: explanation
});

        appealMessage.textContent =
            "Your appeal has been submitted successfully.";

        appealExplanation.value = "";

        await loadAccountNotice();

    } catch (error) {

        console.error("Appeal submission error:", error);

        appealMessage.textContent =
            error.message || "Unable to submit your appeal. Please try again.";

    } finally {

        submitAppealButton.disabled = false;

    }

});

// Check whether the student is logged in
onAuthStateChanged(auth, async function (user) {

    if (!user || !user.emailVerified) {
        window.location.href = "./login.html";
        return;
    }

    studentName.textContent = user.displayName || "Student";

    await loadAccountNotice();

});

// Logout
logoutButton.addEventListener("click", async function () {

    try {
        await signOut(auth);
        window.location.href = "./login.html";

    } catch (error) {
        alert("Unable to log out. Please try again.");
    }

});
