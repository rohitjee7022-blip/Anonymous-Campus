
import { auth, functions } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    httpsCallable
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-functions.js";


// ==========================================
// HTML ELEMENTS
// ==========================================

const form = document.getElementById("feedbackForm");
const facilitySelect = document.getElementById("facility");
const commentInput = document.getElementById("comment");
const message = document.getElementById("formMessage");

const noticeMessage = document.getElementById("accountNoticeMessage");
const noticeDetails = document.getElementById("accountNoticeDetails");
const accountNoticeSection = document.getElementById("accountNoticeSection");

const appealForm = document.getElementById("appealForm");
const appealContainer = document.getElementById("appealFormContainer");
const appealExplanation = document.getElementById("appealExplanation");


// ==========================================
// FIREBASE FUNCTIONS
// ==========================================

const submitFeedback = httpsCallable(functions, "submitFeedback");

const getMyAccountNotice = httpsCallable(
    functions,
    "getMyAccountNotice"
);

const submitSanctionAppeal = httpsCallable(
    functions,
    "submitSanctionAppeal"
);


// ==========================================
// CATEGORY FROM DASHBOARD
// ==========================================

const params = new URLSearchParams(window.location.search);
const selectedCategory = params.get("category");

if (
    selectedCategory &&
    [...facilitySelect.options].some(
        option => option.value === selectedCategory
    )
) {
    facilitySelect.value = selectedCategory;
}


// ==========================================
// ACCOUNT NOTICE
// ==========================================

let currentSanctionId = null;

function formatDate(dateValue) {

    if (!dateValue) {
        return "Not available";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}


async function loadAccountNotice() {

    accountNoticeSection.hidden = true;

    noticeMessage.textContent = "Checking your account notices...";
    noticeDetails.hidden = true;
    appealContainer.hidden = true;

    currentSanctionId = null;

    try {

        const result = await getMyAccountNotice();
        const notice = result.data;

        if (!notice.hasNotice) {

            noticeMessage.textContent =
                "You currently have no account warnings or suspensions.";

            return;
        }

        accountNoticeSection.hidden = false;

        currentSanctionId = notice.sanctionId;

        noticeDetails.hidden = false;
        noticeMessage.textContent = "Your account notice:";

        document.getElementById("noticeAction").textContent =
            notice.action === "warning"
                ? "Account Warning"
                : "Seven-Day Suspension";

        document.getElementById("noticeCategory").textContent =
            notice.category.replaceAll("_", " ");

        document.getElementById("noticeReason").textContent =
            notice.reason;

        document.getElementById("noticeStatus").textContent =
            notice.status;

        document.getElementById("noticeIssuedAt").textContent =
            "Issued: " + formatDate(notice.issuedAt);

        document.getElementById("noticeExpiry").textContent =
            notice.expiresAt
                ? "Expiry: " + formatDate(notice.expiresAt)
                : "Expiry: Not applicable";

        document.getElementById("noticeAppealStatus").textContent =
            notice.appealStatus.replaceAll("_", " ");

        if (
            notice.status === "active" &&
            notice.appealStatus !== "pending"
        ) {
            appealContainer.hidden = false;
        }

        if (notice.suspensionActive) {

            noticeMessage.textContent =
                "Your account currently has an active feedback submission suspension.";

        } else if (notice.status === "revoked") {

            noticeMessage.textContent =
                "This sanction has been reversed.";

        } else {

            noticeMessage.textContent =
                "Account notice retrieved successfully.";
        }

    } catch (error) {

        console.error("Account notice error:", error);

        noticeMessage.textContent =
            "Unable to retrieve account notices. Please refresh the page and try again.";
    }
}


// ==========================================
// STUDENT AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        accountNoticeSection.hidden = true;

        noticeMessage.textContent =
            "Please log in to view your account notices and submit appeals.";

        noticeDetails.hidden = true;

        return;
    }

    await loadAccountNotice();
});


// ==========================================
// SUBMIT APPEAL
// ==========================================

appealForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const explanation = appealExplanation.value.trim();

    if (!currentSanctionId) {

        noticeMessage.textContent =
            "No valid sanction was found.";

        return;
    }

    if (
        explanation.length < 20 ||
        explanation.length > 1000
    ) {

        noticeMessage.textContent =
            "Your appeal must contain between 20 and 1000 characters.";

        return;
    }

    const button = appealForm.querySelector(
        'button[type="submit"]'
    );

    button.disabled = true;

    try {

        const result = await submitSanctionAppeal({
            sanctionId: currentSanctionId,
            explanation
        });

        noticeMessage.textContent = result.data.message;

        appealForm.reset();

        await loadAccountNotice();

    } catch (error) {

        console.error("Appeal submission error:", error);

        if (error.code === "functions/already-exists") {

            noticeMessage.textContent =
                "An appeal for this sanction is already pending.";

        } else if (error.code === "functions/failed-precondition") {

            noticeMessage.textContent =
                error.message;

        } else {

            noticeMessage.textContent =
                error.message || "Unable to submit your appeal. Please try again.";
        }

    } finally {

        button.disabled = false;
    }
});


// ==========================================
// FEEDBACK SUBMISSION
// ==========================================

function showFeedbackMessage(text) {

    message.textContent = text;
    message.classList.add("show");
}


form.addEventListener("submit", async (event) => {

    event.preventDefault();

    console.log("Feedback form submit event triggered");

    message.textContent = "";
    message.classList.remove("show");

    const user = auth.currentUser;

    // AUTHENTICATION CHECK

    if (!user || !user.emailVerified) {

        showFeedbackMessage(
            "Please log in with your verified college account."
        );

        return;
    }

    // FORM VALIDATION

    const facility = facilitySelect.value;

    const ratingInput = form.querySelector(
        'input[name="rating"]:checked'
    );

    const comment = commentInput.value.trim();

    if (!facility) {

        showFeedbackMessage(
            "Please select a facility."
        );

        return;
    }

    if (!ratingInput) {

        showFeedbackMessage(
            "Please select a rating."
        );

        return;
    }

    if (comment.length > 250) {

        showFeedbackMessage(
            "Your comment must be within 250 characters."
        );

        return;
    }

    // SUBMIT BUTTON

    const submitButton = form.querySelector(
        'button[type="submit"], input[type="submit"]'
    );

    if (submitButton) {
        submitButton.disabled = true;
    }

    showFeedbackMessage("Submitting your feedback...");

    try {

        console.log("Calling submitFeedback function...");

        // REFRESH AUTHENTICATION TOKEN

        await user.getIdToken(true);

        const result = await submitFeedback({
            facility,
            rating: Number(ratingInput.value),
            comment
        });

        console.log("Feedback response received:", result.data);

        showFeedbackMessage(result.data.message);

        if (result.data.profanityMasked) {

            message.textContent +=
                " Some inappropriate language was automatically masked.";
        }

        form.reset();

        if (selectedCategory) {
            facilitySelect.value = selectedCategory;
        }

    } catch (error) {

        console.error("Feedback submission error:", error);

        console.error("Error code:", error.code);
        console.error("Error message:", error.message);

        if (error.code === "functions/already-exists") {

            showFeedbackMessage(
                "You have already submitted feedback for this facility this week."
            );

        } else if (error.code === "functions/permission-denied") {

            if (error.message.includes("suspended")) {

                showFeedbackMessage(
                    "Your account is temporarily suspended from submitting feedback. Please check your Account Notice for the expiry date."
                );

            } else {

                showFeedbackMessage(
                    error.message || "Your account is not eligible to submit feedback."
                );
            }

        } else if (error.code === "functions/unauthenticated") {

            showFeedbackMessage(
                "Please log in before submitting feedback."
            );

        } else if (error.code === "functions/failed-precondition") {

            showFeedbackMessage(
                error.message || "A required server configuration is missing."
            );

        } else if (error.code === "functions/invalid-argument") {

            showFeedbackMessage(
                error.message || "Please check your feedback details."
            );

        } else {

            showFeedbackMessage(
                error.message || "Unable to submit feedback. Please try again."
            );
        }

    } finally {

        if (submitButton) {
            submitButton.disabled = false;
        }
    }
});
