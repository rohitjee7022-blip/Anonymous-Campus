
import { auth, functions } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    httpsCallable
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-functions.js";

// ==========================================
// BACKEND FUNCTIONS
// ==========================================

const getFacilityOverview = httpsCallable(functions, "getFacilityOverview");
const getFacilityIssues = httpsCallable(functions, "getFacilityIssues");
const updateIssueStatus = httpsCallable(functions, "updateIssueStatus");
const getPendingFeedback = httpsCallable(functions, "getPendingFeedback");
const moderateFeedback = httpsCallable(functions, "moderateFeedback");
const issueAccountAction = httpsCallable(functions, "issueAccountAction");
const getPendingSanctionAppeals = httpsCallable(functions, "getPendingSanctionAppeals");
const reviewSanctionAppeal = httpsCallable(functions, "reviewSanctionAppeal");

const facilityNames = {
    mess: "Mess & Food",
    laundry: "Laundry",
    wifi: "Wi-Fi & Internet",
    room: "Room Facilities",
    water: "Water Facilities",
    sports: "Campus & Sports"
};

const policyCategories = [
    { value: "targeted_abuse", label: "Targeted abuse" },
    { value: "threats", label: "Threats" },
    { value: "personal_information", label: "Personal information" },
    { value: "spam", label: "Spam" }
];

const message = document.getElementById("adminMessage");

function showMessage(text) {
    if (message) message.textContent = text;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function createSelect(options, placeholder) {
    const select = document.createElement("select");

    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = placeholder;
    select.appendChild(firstOption);

    options.forEach(option => {
        const element = document.createElement("option");
        element.value = option.value;
        element.textContent = option.label;
        select.appendChild(element);
    });

    return select;
}

// ==========================================
// FACILITY OVERVIEW
// ==========================================

function displayOverview(facilities) {

    facilities.forEach(facility => {

        const card = document.getElementById(facility.facility);

        if (!card) return;

        const oldDistribution =
            card.querySelector(".rating-distribution");

        if (oldDistribution) oldDistribution.remove();

        if (!facility.sufficientData) {

            card.querySelector(".average").textContent =
                "Not available";

            card.querySelector(".total").textContent =
                "Not enough responses yet";

            return;
        }

        card.querySelector(".average").textContent =
            `${facility.averageRating} / 5`;

        card.querySelector(".total").textContent =
            `${facility.totalSubmissions} submissions`;

        const distributionContainer =
            createElement("div", "rating-distribution");

        for (let rating = 5; rating >= 1; rating--) {

            const count = facility.ratingDistribution[rating];

            const percentage =
                (count / facility.totalSubmissions) * 100;

            const row = createElement("div", "rating-row");

            const label = createElement("span", "", `${rating} ★`);

            const barBackground =
                createElement("div", "rating-bar-background");

            const barFill =
                createElement("div", "rating-bar-fill");

            barFill.style.width = `${percentage}%`;

            barBackground.appendChild(barFill);

            const countLabel =
                createElement("span", "", count);

            row.append(label, barBackground, countLabel);

            distributionContainer.appendChild(row);
        }

        card.appendChild(distributionContainer);
    });
}

// ==========================================
// FACILITY ISSUES
// ==========================================

async function loadFacilityIssues() {

    const container = document.getElementById("facilityIssues");

    if (!container) return;

    container.textContent = "Loading facility issues...";

    try {

        const result = await getFacilityIssues();

        container.replaceChildren();

        if (!result.data.issues.length) {
            container.textContent =
                "No privacy-reviewed issues available yet.";
            return;
        }

        result.data.issues.forEach(issue => {

            const card = createElement("div", "issue-card");

            const title = createElement("h3", "", issue.title);

            const facility = createElement(
                "p",
                "",
                facilityNames[issue.facility] || issue.facility
            );

            const summary = createElement("p", "", issue.summary);

            const reports = createElement(
                "p",
                "",
                `${issue.reportCount} reports`
            );

            const status = createElement(
                "p",
                "",
                `Status: ${issue.status.replaceAll("_", " ")}`
            );

            const statusOptions = [
                { value: "under_review", label: "Under Review" },
                { value: "action_planned", label: "Action Planned" },
                { value: "resolved", label: "Resolved" }
            ];

            const statusSelect = createSelect(
                statusOptions,
                "Select status"
            );

            statusSelect.value = issue.status;

            const updateButton = createElement(
                "button",
                "update-status-button",
                "Update Status"
            );

            const updateMessage =
                createElement("p", "update-status-message");

            updateButton.addEventListener("click", async () => {

                try {

                    updateButton.disabled = true;
                    updateMessage.textContent = "Updating...";

                    const newStatus = statusSelect.value;

                    await updateIssueStatus({
                        issueId: issue.id,
                        status: newStatus
                    });

                    status.textContent =
                        `Status: ${newStatus.replaceAll("_", " ")}`;

                    updateMessage.textContent =
                        "Status updated successfully.";

                } catch (error) {

                    console.error("Status update error:", error);

                    updateMessage.textContent =
                        error.message || "Unable to update status.";

                } finally {

                    updateButton.disabled = false;
                }
            });

            card.append(
                title,
                facility,
                summary,
                reports,
                status
            );

            if (issue.demoData) {
                card.appendChild(
                    createElement("small", "", "DEMO DATA")
                );
            }

            card.append(
                statusSelect,
                updateButton,
                updateMessage
            );

            container.appendChild(card);
        });

    } catch (error) {

        console.error("Facility issues error:", error);

        container.textContent =
            "Unable to load facility issues.";
    }
}

// ==========================================
// FEEDBACK DISPLAY AND ACCOUNT ACTIONS
// ==========================================

let feedbackLoading = false;

async function loadPendingFeedback() {

    if (feedbackLoading) return;

    const container = document.getElementById("moderationQueue");
    const statusMessage = document.getElementById("moderationMessage");
    const refreshButton = document.getElementById("refreshModeration");

    if (!container) return;

    try {

        feedbackLoading = true;

        if (refreshButton) refreshButton.disabled = true;

        container.textContent = "Loading recent feedback...";

        if (statusMessage) statusMessage.textContent = "";

        const result = await getPendingFeedback();

        container.replaceChildren();

        const feedback = result.data.feedback || [];

        if (feedback.length === 0) {
            container.textContent = "No feedback submitted yet.";
            return;
        }

        feedback.forEach(item => {

            const card = createElement(
                "div",
                "issue-card moderation-card"
            );

            const facility = createElement(
                "h3",
                "",
                facilityNames[item.facility] || item.facility
            );

            const rating = createElement(
                "p",
                "",
                `Student rating: ${item.rating} / 5`
            );

            const comment = createElement(
                "p",
                "",
                item.comment || "No comment provided."
            );

            const visibility = createElement(
                "p",
                "",
                `Feedback status: ${item.visibilityStatus}`
            );

            card.append(
                facility,
                rating,
                comment
            );

            if (item.profanityMasked) {
                card.appendChild(
                    createElement(
                        "small",
                        "",
                        "Automatic profanity masking was applied."
                    )
                );
            }

            card.appendChild(visibility);
            
            // ==========================================
            // COMMENT MODERATION
            // ==========================================

            const moderationHeading = createElement(
                "h4",
                "",
                "Comment Moderation"
            );

            const moderationCategory = createSelect(
                policyCategories,
                "Select policy violation"
            );

            const moderationReason =
                document.createElement("textarea");

            moderationReason.rows = 3;
            moderationReason.maxLength = 500;
            moderationReason.placeholder =
                "Explain the policy violation (20–500 characters).";

            const approveButton = createElement(
                "button",
                "update-status-button",
                "Approve Comment"
            );

            const withholdButton = createElement(
                "button",
                "logout-button",
                "Withhold Comment"
            );

            const moderationMessage =
                createElement("p", "update-status-message");

            async function moderateComment(action) {

                let category = null;
                let reason = null;

                if (action === "withhold") {

                    category = moderationCategory.value;
                    reason = moderationReason.value.trim();

                    if (!category) {
                        moderationMessage.textContent =
                            "Select a policy violation category.";
                        moderationCategory.focus();
                        return;
                    }

                    if (reason.length < 20 || reason.length > 500) {
                        moderationMessage.textContent =
                            "Enter a reason of 20–500 characters.";
                        moderationReason.focus();
                        return;
                    }
                }

                const confirmed = window.confirm(
                    action === "approve"
                        ? "Approve this feedback comment?"
                        : "Withhold this comment for the selected policy violation? Its rating will remain included in statistics."
                );

                if (!confirmed) return;

                approveButton.disabled = true;
                withholdButton.disabled = true;

                moderationMessage.textContent =
                    "Processing moderation decision...";

                try {

                    const response = await moderateFeedback({
                        feedbackId: item.id,
                        action,
                        category,
                        reason
                    });

                    item.visibilityStatus =
                        action === "approve" ? "visible" : "restricted";

                    visibility.textContent =
                        `Feedback status: ${item.visibilityStatus}`;

                    moderationMessage.textContent =
                        response.data.message;

                    moderationCategory.disabled = true;
                    moderationReason.disabled = true;

                } catch (error) {

                    console.error("Comment moderation error:", error);

                    moderationMessage.textContent =
                        error.message || "Unable to moderate comment.";

                    approveButton.disabled = false;
                    withholdButton.disabled = false;
                }
            }

            approveButton.addEventListener("click", () => {
                moderateComment("approve");
            });

            withholdButton.addEventListener("click", () => {
                moderateComment("withhold");
            });

            card.append(
                moderationHeading,
                moderationCategory,
                moderationReason,
                approveButton,
                withholdButton,
                moderationMessage
            );


            // No account action for already restricted feedback.
            if (item.visibilityStatus !== "restricted") {

                const actionHeading =
                    createElement("h4", "", "Policy action");

                const categorySelect = createSelect(
                    policyCategories,
                    "Select policy violation"
                );

                const reasonInput =
                    document.createElement("textarea");

                reasonInput.rows = 3;
                reasonInput.maxLength = 500;
                reasonInput.placeholder =
                    "Explain the specific policy violation (20–500 characters).";

                const warningButton = createElement(
                    "button",
                    "update-status-button",
                    "Issue Warning"
                );

                const suspensionButton = createElement(
                    "button",
                    "logout-button",
                    "Suspend for 7 Days"
                );

                const actionMessage =
                    createElement("p", "update-status-message");

                async function submitAction(action, button) {

                    const category = categorySelect.value;
                    const reason = reasonInput.value.trim();

                    if (!category) {
                        actionMessage.textContent =
                            "Please select a policy violation.";
                        categorySelect.focus();
                        return;
                    }

                    if (reason.length < 20 || reason.length > 500) {
                        actionMessage.textContent =
                            "Explain the violation in 20–500 characters.";
                        reasonInput.focus();
                        return;
                    }

                    const confirmed = window.confirm(
                        action === "warning"
                            ? "Issue a formal warning for this specific policy violation?"
                            : "Suspend this account from feedback submission for 7 days?"
                    );

                    if (!confirmed) return;

                    try {

                        warningButton.disabled = true;
                        suspensionButton.disabled = true;

                        actionMessage.textContent =
                            "Processing account action...";

                        const response = await issueAccountAction({
                            feedbackId: item.id,
                            action,
                            category,
                            reason
                        });

                        actionMessage.textContent =
                            response.data.message;

                        warningButton.remove();
                        suspensionButton.remove();
                        categorySelect.disabled = true;
                        reasonInput.disabled = true;

                    } catch (error) {

                        console.error("Account action error:", error);

                        actionMessage.textContent =
                            error.message || "Unable to issue account action.";

                        warningButton.disabled = false;
                        suspensionButton.disabled = false;
                    }
                }

                warningButton.addEventListener("click", () => {
                    submitAction("warning", warningButton);
                });

                suspensionButton.addEventListener("click", () => {
                    submitAction("suspend_7d", suspensionButton);
                });

                card.append(
                    actionHeading,
                    categorySelect,
                    reasonInput,
                    warningButton,
                    suspensionButton,
                    actionMessage
                );
            }

            container.appendChild(card);
        });

        if (statusMessage) {
            statusMessage.textContent =
                `${feedback.length} recent feedback item(s) loaded.`;
        }

    } catch (error) {

        console.error("Feedback loading error:", error);

        container.textContent = "Unable to load recent feedback.";

        if (statusMessage) {
            statusMessage.textContent =
                error.message || "Please try again.";
        }

    } finally {

        feedbackLoading = false;

        if (refreshButton) refreshButton.disabled = false;
    }
}

// ==========================================
// APPEALS SECTION
// ==========================================

function createAppealsSection() {

    const existing = document.getElementById("appealsSection");

    if (existing) return existing;

    const moderationQueue =
        document.getElementById("moderationQueue");

    if (!moderationQueue) return null;

    const section = createElement("section");
    section.id = "appealsSection";

    const heading = createElement(
        "h2",
        "",
        "Student Appeals"
    );

    const description = createElement(
        "p",
        "",
        "Review appeals submitted by students against account actions."
    );

    const refreshButton = createElement(
        "button",
        "update-status-button",
        "Refresh Appeals"
    );

    refreshButton.id = "refreshAppeals";

    const message = createElement("p");
    message.id = "appealsMessage";

    const container = createElement("div");
    container.id = "appealsQueue";

    refreshButton.addEventListener("click", loadPendingAppeals);

    section.append(
        heading,
        description,
        refreshButton,
        message,
        container
    );

    moderationQueue.parentElement.appendChild(section);

    return section;
}

let appealsLoading = false;

async function loadPendingAppeals() {

    if (appealsLoading) return;

    const container = document.getElementById("appealsQueue");
    const statusMessage = document.getElementById("appealsMessage");
    const refreshButton = document.getElementById("refreshAppeals");

    if (!container) return;

    try {

        appealsLoading = true;

        if (refreshButton) refreshButton.disabled = true;

        container.textContent = "Loading pending appeals...";

        const result = await getPendingSanctionAppeals();

        container.replaceChildren();

        const appeals = result.data.appeals || [];

        if (appeals.length === 0) {
            container.textContent = "No pending appeals.";
            return;
        }

        appeals.forEach(appeal => {

            const card = createElement("div", "issue-card");

            card.append(
                createElement("h3", "", "Appeal"),
                createElement(
                    "p",
                    "",
                    `Original action: ${appeal.action}`
                ),
                createElement(
                    "p",
                    "",
                    `Policy category: ${appeal.category}`
                ),
                createElement(
                    "p",
                    "",
                    `Original reason: ${appeal.originalReason}`
                ),
                createElement(
                    "p",
                    "",
                    `Student explanation: ${appeal.explanation}`
                )
            );

            const reviewNote = document.createElement("textarea");

            reviewNote.rows = 3;
            reviewNote.maxLength = 500;
            reviewNote.placeholder =
                "Write the reason for your appeal decision (10–500 characters).";

            const upholdButton = createElement(
                "button",
                "update-status-button",
                "Uphold Sanction"
            );

            const reverseButton = createElement(
                "button",
                "logout-button",
                "Accept Appeal / Revoke Sanction"
            );

            const reviewMessage =
                createElement("p", "update-status-message");

            async function reviewAppeal(decision, button) {

                const note = reviewNote.value.trim();

                if (note.length < 10 || note.length > 500) {
                    reviewMessage.textContent =
                        "Enter a review note of 10–500 characters.";
                    reviewNote.focus();
                    return;
                }

                const confirmed = window.confirm(
                    decision === "reversed"
                        ? "Accept this appeal and revoke the sanction?"
                        : "Uphold the original sanction?"
                );

                if (!confirmed) return;

                try {

                    upholdButton.disabled = true;
                    reverseButton.disabled = true;

                    reviewMessage.textContent = "Submitting decision...";

                    const response = await reviewSanctionAppeal({
                        appealId: appeal.id,
                        decision,
                        reviewNote: note
                    });

                    reviewMessage.textContent = response.data.message;

                    card.remove();

                } catch (error) {

                    console.error("Appeal review error:", error);

                    reviewMessage.textContent =
                        error.message || "Unable to review appeal.";

                    upholdButton.disabled = false;
                    reverseButton.disabled = false;
                }
            }

            upholdButton.addEventListener("click", () => {
                reviewAppeal("upheld", upholdButton);
            });

            reverseButton.addEventListener("click", () => {
                reviewAppeal("reversed", reverseButton);
            });

            card.append(
                reviewNote,
                upholdButton,
                reverseButton,
                reviewMessage
            );

            container.appendChild(card);
        });

        if (statusMessage) {
            statusMessage.textContent =
                `${appeals.length} pending appeal(s).`;
        }

    } catch (error) {

        console.error("Appeals loading error:", error);

        container.textContent = "Unable to load appeals.";

        if (statusMessage) {
            statusMessage.textContent =
                error.message || "Please try again.";
        }

    } finally {

        appealsLoading = false;

        if (refreshButton) refreshButton.disabled = false;
    }
}

// ==========================================
// MAIN DASHBOARD
// ==========================================

let dashboardInitialized = false;
let overviewLoading = false;

async function loadOverview() {

    if (overviewLoading) return;

    const refreshButton =
        document.getElementById("refreshOverview");

    try {

        overviewLoading = true;

        if (refreshButton) refreshButton.disabled = true;

        showMessage("Loading facility statistics...");

        const result = await getFacilityOverview();

        await loadFacilityIssues();

        if (result.data.success) {
            displayOverview(result.data.overview);
            showMessage("Facility overview updated successfully.");
        }

    } catch (error) {

        console.error("Dashboard error:", error);

        showMessage(
            error.message || "Unable to load dashboard."
        );

    } finally {

        overviewLoading = false;

        if (refreshButton) refreshButton.disabled = false;
    }
}

// ==========================================
// REFRESH BUTTONS
// ==========================================

const refreshOverviewButton =
    document.getElementById("refreshOverview");

if (refreshOverviewButton) {
    refreshOverviewButton.addEventListener("click", loadOverview);
}

const refreshModerationButton =
    document.getElementById("refreshModeration");

if (refreshModerationButton) {
    refreshModerationButton.addEventListener("click", loadPendingFeedback);
}

// ==========================================
// AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, async user => {

    if (!user || !user.emailVerified) {
        window.location.href = "../html/login.html";
        return;
    }

    if (dashboardInitialized) return;

    dashboardInitialized = true;

    console.log("Admin dashboard initialized.");

    createAppealsSection();

    await loadOverview();
    await loadPendingFeedback();
    await loadPendingAppeals();
});

// ==========================================
// LOGOUT
// ==========================================

const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        try {

            await signOut(auth);

            window.location.href = "./login.html";

        } catch (error) {

            console.error("Logout error:", error);

            showMessage("Unable to log out. Please try again.");
        }
    });
}
