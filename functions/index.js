
const crypto = require("crypto");

const { initializeApp } = require("firebase-admin/app");
const {
    getFirestore,
    FieldValue,
    Timestamp
} = require("firebase-admin/firestore");

const {
    onRequest,
    HttpsError,
    onCall
} = require("firebase-functions/v2/https");

initializeApp();

const db = getFirestore();

const COLLEGE_DOMAIN = "@iiitsonepat.ac.in";

const FACILITIES = [
    "mess",
    "laundry",
    "wifi",
    "room",
    "water",
    "sports"
];

const ISSUE_REPORT_THRESHOLD = 5;

const POLICY_CATEGORIES = [
    "targeted_abuse",
    "threats",
    "personal_information",
    "spam"
];

// ==========================================
// PROFANITY DICTIONARY
// ==========================================

const PROFANITY_TERMS = [
    "motherfucker",
    "bullshit",
    "asshole",
    "arsehole",
    "fucking",
    "fucked",
    "fucker",
    "shitty",
    "bitch",
    "bastard",
    "dickhead",
    "pussy",
    "cunt",
    "prick",
    "whore",
    "slut",
    "fuck",
    "shit",
    "dick",
    "piss",

    "behenchod",
    "madarchod",
    "bhosdike",
    "bhosdi",
    "bhosda",
    "chutiya",
    "chutiye",
    "chutad",
    "chut",
    "gaand",
    "gandu",
    "harami",
    "kameena",
    "kamina",
    "lawda",
    "lauda",
    "lavde",
    "lund",
    "randi",
    "saala",
    "saali"
];

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

async function verifyAdmin(request) {

    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Please log in first."
        );
    }

    const adminSnapshot = await db
        .collection("adminUsers")
        .doc(request.auth.uid)
        .get();

    if (
        !adminSnapshot.exists ||
        adminSnapshot.data().role !== "admin"
    ) {
        throw new HttpsError(
            "permission-denied",
            "You are not authorized to access the admin panel."
        );
    }
}

// ==========================================
// ACCOUNT PRIVACY KEY
// ==========================================

function getAccountKey(uid) {

    const secret = process.env.ANONYMOUS_ACCOUNT_SECRET;

    if (
        typeof secret !== "string" ||
        secret.length < 32
    ) {
        throw new HttpsError(
            "failed-precondition",
            "The account privacy key is not configured."
        );
    }

    return crypto
        .createHmac("sha256", secret)
        .update(uid)
        .digest("hex");
}

// ==========================================
// PROFANITY MASKING
// ==========================================

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function maskProfanity(comment) {

    let result = comment;
    let masked = false;

    for (const term of PROFANITY_TERMS) {

        const flexiblePattern = term
            .split("")
            .map(escapeRegex)
            .join("[^a-z0-9]*");

        const pattern = new RegExp(
            `(^|[^a-z0-9])(${flexiblePattern})(?=$|[^a-z0-9])`,
            "gi"
        );

        result = result.replace(
            pattern,
            (fullMatch, boundary, matchedWord) => {

                masked = true;

                return boundary +
                    matchedWord.replace(/[a-z0-9]/gi, "*");
            }
        );
    }

    return {
        comment: result,
        masked
    };
}

// ==========================================
// WEEKLY SUBMISSION LIMIT
// ==========================================

function getWeekKey() {

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const values = {};

    parts.forEach(part => {
        values[part.type] = part.value;
    });

    const indiaDate = new Date(
        Date.UTC(
            Number(values.year),
            Number(values.month) - 1,
            Number(values.day)
        )
    );

    const day = indiaDate.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;

    indiaDate.setUTCDate(
        indiaDate.getUTCDate() - daysSinceMonday
    );

    return indiaDate.toISOString().slice(0, 10);
}

// ==========================================
// HEALTH CHECK
// ==========================================

exports.healthCheck = onRequest((request, response) => {

    response.status(200).json({
        success: true,
        message: "Anonymous Campus backend is running!"
    });

});

// ==========================================
// STUDENT FEEDBACK SUBMISSION
// ==========================================

exports.submitFeedback = onCall(async (request) => {

    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Please log in before submitting feedback."
        );
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email;

    if (
        request.auth.token.email_verified !== true ||
        typeof email !== "string" ||
        !email.toLowerCase().endsWith(COLLEGE_DOMAIN)
    ) {
        throw new HttpsError(
            "permission-denied",
            "A verified IIIT Sonepat college account is required."
        );
    }

    const {
        facility,
        rating,
        comment = ""
    } = request.data || {};

    if (!FACILITIES.includes(facility)) {
        throw new HttpsError(
            "invalid-argument",
            "Please select a valid facility."
        );
    }

    if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {
        throw new HttpsError(
            "invalid-argument",
            "Rating must be a whole number between 1 and 5."
        );
    }

    if (
        typeof comment !== "string" ||
        comment.length > 250
    ) {
        throw new HttpsError(
            "invalid-argument",
            "Comment must contain no more than 250 characters."
        );
    }

    const cleanedComment = comment.trim();
    const maskedResult = maskProfanity(cleanedComment);

    const accountKey = getAccountKey(uid);
    const weekKey = getWeekKey();

    const eligibilityRef = db
        .collection("studentEligibility")
        .doc(uid);

    const quotaRef = db
        .collection("weeklyQuota")
        .doc(uid)
        .collection("submissions")
        .doc(`${facility}_${weekKey}`);

    const restrictionRef = db
        .collection("accountRestrictions")
        .doc(accountKey);

    const feedbackRef = db
        .collection("feedbackInbox")
        .doc();

    const authorRef = db
        .collection("feedbackAuthors")
        .doc(feedbackRef.id);

    const facilityIssueRef = db
        .collection("facilityIssues")
        .doc(facility);

    await db.runTransaction(async (transaction) => {

        const eligibilitySnapshot =
            await transaction.get(eligibilityRef);

        const quotaSnapshot =
            await transaction.get(quotaRef);

        const restrictionSnapshot =
            await transaction.get(restrictionRef);

        const facilityIssueSnapshot = rating <= 2
            ? await transaction.get(facilityIssueRef)
            : null;

        if (!eligibilitySnapshot.exists) {
            throw new HttpsError(
                "permission-denied",
                "Your student eligibility has not been approved."
            );
        }

        const eligibility = eligibilitySnapshot.data();

        if (
            eligibility.status !== "active" ||
            eligibility.email?.toLowerCase() !== email.toLowerCase()
        ) {
            throw new HttpsError(
                "permission-denied",
                "Your student account is not currently eligible."
            );
        }

        if (quotaSnapshot.exists) {
            throw new HttpsError(
                "already-exists",
                "You have already submitted feedback for this facility this week."
            );
        }

        if (restrictionSnapshot.exists) {

            const restriction = restrictionSnapshot.data();

            if (
                restriction.status === "suspended" &&
                restriction.expiresAt &&
                restriction.expiresAt.toMillis() > Date.now()
            ) {
                throw new HttpsError(
                    "permission-denied",
                    "Your account is temporarily suspended from submitting feedback."
                );
            }
        }

        transaction.create(feedbackRef, {
            facility,
            rating,
            comment: maskedResult.comment,
            profanityMasked: maskedResult.masked,
            visibilityStatus: "visible",
            weekKey,
            createdAt: FieldValue.serverTimestamp()
        });

        transaction.create(authorRef, {
            accountKey,
            createdAt: FieldValue.serverTimestamp()
        });

        transaction.create(quotaRef, {
            facility,
            weekKey,
            createdAt: FieldValue.serverTimestamp()
        });

        // Automatically create or update facility issues
        if (rating <= 2) {

            if (facilityIssueSnapshot.exists) {

                transaction.update(facilityIssueRef, {
                    reportCount: FieldValue.increment(1),
                    updatedAt: FieldValue.serverTimestamp()
                });

            } else {

                const issueDetails = {
                    mess: {
                        title: "Mess and food quality concerns",
                        summary: "Students have reported concerns about mess and food facilities."
                    },
                    laundry: {
                        title: "Laundry facility concerns",
                        summary: "Students have reported concerns about laundry services."
                    },
                    wifi: {
                        title: "Wi-Fi and internet concerns",
                        summary: "Students have reported concerns about internet connectivity."
                    },
                    room: {
                        title: "Room facility concerns",
                        summary: "Students have reported concerns about room maintenance and facilities."
                    },
                    water: {
                        title: "Water facility concerns",
                        summary: "Students have reported concerns about campus water facilities."
                    },
                    sports: {
                        title: "Sports facility concerns",
                        summary: "Students have reported concerns about sports facilities."
                    }
                };

                transaction.create(facilityIssueRef, {
                    facility,
                    title: issueDetails[facility].title,
                    summary: issueDetails[facility].summary,
                    reportCount: 1,
                    status: "under_review",
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    demoData: false
                });

            }
        }

    });

    return {
        success: true,
        message: "Your feedback has been submitted successfully.",
        profanityMasked: maskedResult.masked
    };

});

// ==========================================
// FACILITY OVERVIEW
// ==========================================

exports.getFacilityOverview = onCall(async (request) => {

    await verifyAdmin(request);

    const MINIMUM_RESPONSES = 5;
    const overview = [];

    for (const facility of FACILITIES) {

        const snapshot = await db
            .collection("feedbackInbox")
            .where("facility", "==", facility)
            .get();

        const distribution = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        };

        let ratingTotal = 0;
        let validRatingCount = 0;

        snapshot.forEach((doc) => {

            const rating = doc.data().rating;

            if (
                Number.isInteger(rating) &&
                rating >= 1 &&
                rating <= 5
            ) {
                distribution[rating]++;
                ratingTotal += rating;
                validRatingCount++;
            }

        });

        if (validRatingCount < MINIMUM_RESPONSES) {

            overview.push({
                facility,
                sufficientData: false,
                totalSubmissions: null,
                averageRating: null,
                ratingDistribution: null
            });

            continue;
        }

        overview.push({
            facility,
            sufficientData: true,
            totalSubmissions: validRatingCount,
            averageRating: Number(
                (ratingTotal / validRatingCount).toFixed(2)
            ),
            ratingDistribution: distribution
        });

    }

    return {
        success: true,
        overview
    };

});

// ==========================================
// FACILITY ISSUES
// ==========================================

exports.getFacilityIssues = onCall(async (request) => {

    await verifyAdmin(request);

    const snapshot = await db
        .collection("facilityIssues")
        .get();

    const issues = [];

    snapshot.forEach((doc) => {

        const data = doc.data();

        if (
            typeof data.reportCount === "number" &&
            data.reportCount >= ISSUE_REPORT_THRESHOLD &&
            [
                "under_review",
                "action_planned",
                "resolved"
            ].includes(data.status)
        ) {
            issues.push({
                id: doc.id,
                facility: data.facility,
                title: data.title,
                summary: data.summary,
                reportCount: data.reportCount,
                status: data.status,
                demoData: data.demoData === true
            });
        }

    });

    return {
        success: true,
        issues
    };

});

// ==========================================
// STUDENT: GET TRACKED FACILITY ISSUES
// ==========================================

exports.getStudentFacilityIssues = onCall(async (request) => {

    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Please log in to track facility issues."
        );
    }

    const email = request.auth.token.email;

    if (
        request.auth.token.email_verified !== true ||
        typeof email !== "string" ||
        !email.toLowerCase().endsWith(COLLEGE_DOMAIN)
    ) {
        throw new HttpsError(
            "permission-denied",
            "A verified IIIT Sonepat college account is required."
        );
    }

    const eligibilitySnapshot = await db
        .collection("studentEligibility")
        .doc(request.auth.uid)
        .get();

    if (
        !eligibilitySnapshot.exists ||
        eligibilitySnapshot.data().status !== "active" ||
        eligibilitySnapshot.data().email?.toLowerCase() !== email.toLowerCase()
    ) {
        throw new HttpsError(
            "permission-denied",
            "Your student account is not currently eligible."
        );
    }

    const snapshot = await db
        .collection("facilityIssues")
        .get();

    const issues = [];

    snapshot.forEach((doc) => {

        const data = doc.data();

        if (
            typeof data.reportCount === "number" &&
            data.reportCount >= ISSUE_REPORT_THRESHOLD &&
            [
                "under_review",
                "action_planned",
                "resolved"
            ].includes(data.status)
        ) {
            issues.push({
                id: doc.id,
                facility: data.facility,
                title: data.title,
                summary: data.summary,
                reportCount: data.reportCount,
                status: data.status
            });
        }

    });

    return {
        success: true,
        issues
    };

});

// ==========================================
// UPDATE FACILITY ISSUE STATUS
// ==========================================

exports.updateIssueStatus = onCall(async (request) => {

    await verifyAdmin(request);

    const {
        issueId,
        status
    } = request.data || {};

    if (
        typeof issueId !== "string" ||
        !issueId.trim()
    ) {
        throw new HttpsError(
            "invalid-argument",
            "A valid issue ID is required."
        );
    }

    const allowedStatuses = [
        "under_review",
        "action_planned",
        "resolved"
    ];

    if (!allowedStatuses.includes(status)) {
        throw new HttpsError(
            "invalid-argument",
            "Invalid issue status."
        );
    }

    const issueRef = db
        .collection("facilityIssues")
        .doc(issueId);

    const issueSnapshot = await issueRef.get();

    if (!issueSnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "Issue not found."
        );
    }

    const issueData = issueSnapshot.data();

    if (
        typeof issueData.reportCount !== "number" ||
        issueData.reportCount < ISSUE_REPORT_THRESHOLD
    ) {
        throw new HttpsError(
            "failed-precondition",
            "This issue does not meet the minimum report threshold."
        );
    }

    await issueRef.update({
        status
    });

    return {
        success: true,
        message: "Issue status updated successfully."
    };

});

// ==========================================
// ADMIN ACCESS CHECK
// ==========================================

exports.checkAdminAccess = onCall(async (request) => {

    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Please log in first."
        );
    }

    const adminSnapshot = await db
        .collection("adminUsers")
        .doc(request.auth.uid)
        .get();

    return {
        isAdmin:
            adminSnapshot.exists &&
            adminSnapshot.data().role === "admin"
    };

});

// ==========================================
// GET RECENT FEEDBACK FOR ADMIN
// ==========================================

exports.getPendingFeedback = onCall(async (request) => {

    await verifyAdmin(request);

    const snapshot = await db
        .collection("feedbackInbox")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

    const feedback = snapshot.docs.map((document) => {

        const data = document.data();

        return {
            id: document.id,
            facility: data.facility,
            rating: data.rating,
            comment: typeof data.comment === "string"
                ? data.comment
                : "",
            profanityMasked: data.profanityMasked === true,
            visibilityStatus: data.visibilityStatus || "visible"
        };

    });

    return {
        feedback
    };

});

// ==========================================
// APPROVE OR WITHHOLD FEEDBACK COMMENTS
// ==========================================

exports.moderateFeedback = onCall(async (request) => {

    await verifyAdmin(request);

    const {
        feedbackId,
        action,
        category,
        reason
    } = request.data || {};

    if (
        typeof feedbackId !== "string" ||
        !feedbackId.trim()
    ) {
        throw new HttpsError(
            "invalid-argument",
            "A valid feedback ID is required."
        );
    }

    if (!["approve", "withhold"].includes(action)) {
        throw new HttpsError(
            "invalid-argument",
            "Choose approve or withhold."
        );
    }

    if (action === "withhold") {

        if (!POLICY_CATEGORIES.includes(category)) {
            throw new HttpsError(
                "invalid-argument",
                "Select a valid policy violation category."
            );
        }

        if (
            typeof reason !== "string" ||
            reason.trim().length < 20 ||
            reason.trim().length > 500
        ) {
            throw new HttpsError(
                "invalid-argument",
                "The reason must contain between 20 and 500 characters."
            );
        }

    }

    const feedbackRef = db
        .collection("feedbackInbox")
        .doc(feedbackId);

    const auditRef = db
        .collection("feedbackModerationAudit")
        .doc();

    await db.runTransaction(async (transaction) => {

        const feedbackSnapshot =
            await transaction.get(feedbackRef);

        if (!feedbackSnapshot.exists) {
            throw new HttpsError(
                "not-found",
                "Feedback not found."
            );
        }

        const feedback = feedbackSnapshot.data();

        if (
            action === "withhold" &&
            (
                typeof feedback.comment !== "string" ||
                !feedback.comment.trim()
            )
        ) {
            throw new HttpsError(
                "failed-precondition",
                "There is no comment to withhold."
            );
        }

        const visibilityStatus =
            action === "approve" ? "visible" : "restricted";

        const updateData = {
            visibilityStatus,
            moderatedBy: request.auth.uid,
            moderatedAt: FieldValue.serverTimestamp()
        };

        if (action === "withhold") {
            updateData.moderationCategory = category;
            updateData.moderationReason = reason.trim();
        } else {
            updateData.moderationCategory = null;
            updateData.moderationReason = null;
        }

        transaction.update(feedbackRef, updateData);

        transaction.create(auditRef, {
            feedbackId,
            action,
            category: action === "withhold" ? category : null,
            reason: action === "withhold" ? reason.trim() : null,
            adminUid: request.auth.uid,
            createdAt: FieldValue.serverTimestamp()
        });

    });

    return {
        success: true,
        message: action === "approve"
            ? "Feedback comment approved successfully."
            : "Feedback comment withheld successfully. Its rating remains included."
    };

});

// ==========================================
// ISSUE WARNING OR 7-DAY SUSPENSION
// ==========================================

exports.issueAccountAction = onCall(async (request) => {

    await verifyAdmin(request);

    const {
        feedbackId,
        action,
        category,
        reason
    } = request.data || {};

    if (
        typeof feedbackId !== "string" ||
        !feedbackId.trim()
    ) {
        throw new HttpsError(
            "invalid-argument",
            "A valid feedback ID is required."
        );
    }

    if (!["warning", "suspend_7d"].includes(action)) {
        throw new HttpsError(
            "invalid-argument",
            "Choose a valid account action."
        );
    }

    if (!POLICY_CATEGORIES.includes(category)) {
        throw new HttpsError(
            "invalid-argument",
            "Select a valid policy violation category."
        );
    }

    if (
        typeof reason !== "string" ||
        reason.trim().length < 20 ||
        reason.trim().length > 500
    ) {
        throw new HttpsError(
            "invalid-argument",
            "The reason must contain between 20 and 500 characters."
        );
    }

    const feedbackRef = db
        .collection("feedbackInbox")
        .doc(feedbackId);

    const authorRef = db
        .collection("feedbackAuthors")
        .doc(feedbackId);

    const sanctionRef = db
        .collection("sanctionRecords")
        .doc();

    const auditRef = db
        .collection("sanctionAudit")
        .doc();

    await db.runTransaction(async (transaction) => {

        const authorSnapshot =
            await transaction.get(authorRef);

        const feedbackSnapshot =
            await transaction.get(feedbackRef);

        if (!feedbackSnapshot.exists) {
            throw new HttpsError(
                "not-found",
                "Feedback not found."
            );
        }

        if (!authorSnapshot.exists) {
            throw new HttpsError(
                "failed-precondition",
                "This feedback predates account mapping and cannot be used for account action."
            );
        }

        const accountKey = authorSnapshot.data().accountKey;

        const restrictionRef = db
            .collection("accountRestrictions")
            .doc(accountKey);

        const restrictionSnapshot =
            await transaction.get(restrictionRef);

        if (
            action === "suspend_7d" &&
            restrictionSnapshot.exists
        ) {

            const existing = restrictionSnapshot.data();

            if (
                existing.status === "suspended" &&
                existing.expiresAt &&
                existing.expiresAt.toMillis() > Date.now()
            ) {
                throw new HttpsError(
                    "failed-precondition",
                    "This account already has an active suspension."
                );
            }

        }

        const now = Timestamp.now();

        let expiresAt = null;

        if (action === "suspend_7d") {
            expiresAt = Timestamp.fromMillis(
                now.toMillis() + 7 * 24 * 60 * 60 * 1000
            );
        }

        transaction.create(sanctionRef, {
            accountKey,
            feedbackId,
            action,
            category,
            reason: reason.trim(),
            status: "active",
            appealStatus: "not_submitted",
            issuedBy: request.auth.uid,
            issuedAt: FieldValue.serverTimestamp(),
            expiresAt
        });

        if (action === "suspend_7d") {

            transaction.set(restrictionRef, {
                status: "suspended",
                sanctionId: sanctionRef.id,
                expiresAt
            });

        }

        transaction.set(
            db.collection("accountNotices").doc(accountKey),
            {
                sanctionId: sanctionRef.id,
                action,
                category,
                reason: reason.trim(),
                status: "active",
                appealStatus: "not_submitted",
                issuedAt: FieldValue.serverTimestamp(),
                expiresAt
            }
        );

        transaction.create(auditRef, {
            sanctionId: sanctionRef.id,
            feedbackId,
            accountKey,
            action,
            category,
            reason: reason.trim(),
            adminUid: request.auth.uid,
            createdAt: FieldValue.serverTimestamp()
        });

    });

    return {
        success: true,
        message: action === "warning"
            ? "Warning issued successfully."
            : "Seven-day suspension issued successfully."
    };

});

// ==========================================
// STUDENT: GET PRIVATE ACCOUNT NOTICE
// ==========================================

exports.getMyAccountNotice = onCall(async (request) => {

    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Please log in first."
        );
    }

    const accountKey = getAccountKey(request.auth.uid);

    const noticeSnapshot = await db
        .collection("accountNotices")
        .doc(accountKey)
        .get();

    if (!noticeSnapshot.exists) {
        return {
            hasNotice: false
        };
    }

    const notice = noticeSnapshot.data();

    const suspensionActive =
        notice.action === "suspend_7d" &&
        notice.status === "active" &&
        notice.expiresAt &&
        notice.expiresAt.toMillis() > Date.now();

    return {
        hasNotice: true,
        sanctionId: notice.sanctionId,
        action: notice.action,
        category: notice.category,
        reason: notice.reason,
        status: notice.status,
        appealStatus: notice.appealStatus,
        issuedAt: notice.issuedAt
            ? notice.issuedAt.toDate().toISOString()
            : null,
        expiresAt: notice.expiresAt
            ? notice.expiresAt.toDate().toISOString()
            : null,
        suspensionActive: Boolean(suspensionActive)
    };

});

// ==========================================
// STUDENT: SUBMIT AN APPEAL
// ==========================================

exports.submitSanctionAppeal = onCall(async (request) => {

    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Please log in first."
        );
    }

    const {
        sanctionId,
        explanation
    } = request.data || {};

    if (
        typeof sanctionId !== "string" ||
        !sanctionId.trim()
    ) {
        throw new HttpsError(
            "invalid-argument",
            "A valid sanction ID is required."
        );
    }

    if (
        typeof explanation !== "string" ||
        explanation.trim().length < 20 ||
        explanation.trim().length > 1000
    ) {
        throw new HttpsError(
            "invalid-argument",
            "Your appeal must contain between 20 and 1000 characters."
        );
    }

    const accountKey = getAccountKey(request.auth.uid);

    const sanctionRef = db
        .collection("sanctionRecords")
        .doc(sanctionId);

    const noticeRef = db
        .collection("accountNotices")
        .doc(accountKey);

    const appealRef = db
        .collection("sanctionAppeals")
        .doc();

    await db.runTransaction(async (transaction) => {

        // Read sanction
        const sanctionSnapshot =
            await transaction.get(sanctionRef);

        if (!sanctionSnapshot.exists) {
            throw new HttpsError(
                "not-found",
                "Sanction not found."
            );
        }

        const sanction = sanctionSnapshot.data();

        // Verify ownership
        if (sanction.accountKey !== accountKey) {
            throw new HttpsError(
                "permission-denied",
                "You cannot appeal another account's sanction."
            );
        }

        // Verify sanction status
        if (sanction.status !== "active") {
            throw new HttpsError(
                "failed-precondition",
                "This sanction is no longer active."
            );
        }

        // Prevent duplicate pending appeals
        if (sanction.appealStatus === "pending") {
            throw new HttpsError(
                "already-exists",
                "An appeal for this sanction is already pending."
            );
        }

        // Read account notice
        const noticeSnapshot =
            await transaction.get(noticeRef);

        if (!noticeSnapshot.exists) {
            throw new HttpsError(
                "not-found",
                "Account notice not found."
            );
        }

        // Check for an existing pending appeal
        const existingAppealsQuery = db
            .collection("sanctionAppeals")
            .where("sanctionId", "==", sanctionId)
            .where("status", "==", "pending")
            .limit(1);

        const existingAppealsSnapshot =
            await transaction.get(existingAppealsQuery);

        if (!existingAppealsSnapshot.empty) {
            throw new HttpsError(
                "already-exists",
                "An appeal for this sanction is already pending."
            );
        }

        // Create appeal
        transaction.create(appealRef, {
            sanctionId,
            accountKey,
            action: sanction.action,
            category: sanction.category,
            originalReason: sanction.reason,
            explanation: explanation.trim(),
            status: "pending",
            submittedAt: FieldValue.serverTimestamp()
        });

        // Update sanction
        transaction.update(sanctionRef, {
            appealStatus: "pending"
        });

        // Update account notice
        transaction.update(noticeRef, {
            appealStatus: "pending"
        });

    });

    return {
        success: true,
        message: "Your appeal has been submitted."
    };

});

// ==========================================
// ADMIN: GET PENDING APPEALS
// ==========================================

exports.getPendingSanctionAppeals = onCall(async (request) => {

    await verifyAdmin(request);

    const snapshot = await db
        .collection("sanctionAppeals")
        .where("status", "==", "pending")
        .limit(50)
        .get();

    const appeals = snapshot.docs.map((document) => {

        const data = document.data();

        return {
            id: document.id,
            sanctionId: data.sanctionId,
            action: data.action,
            category: data.category,
            originalReason: data.originalReason,
            explanation: data.explanation,
            submittedAt: data.submittedAt
                ? data.submittedAt.toDate().toISOString()
                : null
        };

    });

    return {
        appeals
    };

});

// ==========================================
// ADMIN: REVIEW AN APPEAL
// ==========================================

exports.reviewSanctionAppeal = onCall(async (request) => {

    await verifyAdmin(request);

    const {
        appealId,
        decision,
        reviewNote
    } = request.data || {};

    if (
        typeof appealId !== "string" ||
        !appealId.trim()
    ) {
        throw new HttpsError(
            "invalid-argument",
            "A valid appeal ID is required."
        );
    }

    if (!["upheld", "reversed"].includes(decision)) {
        throw new HttpsError(
            "invalid-argument",
            "Choose upheld or reversed."
        );
    }

    if (
        typeof reviewNote !== "string" ||
        reviewNote.trim().length < 10 ||
        reviewNote.trim().length > 500
    ) {
        throw new HttpsError(
            "invalid-argument",
            "The review note must contain between 10 and 500 characters."
        );
    }

    const appealRef = db
        .collection("sanctionAppeals")
        .doc(appealId);

    const auditRef = db
        .collection("sanctionAudit")
        .doc();

    await db.runTransaction(async (transaction) => {

        const appealSnapshot =
            await transaction.get(appealRef);

        if (!appealSnapshot.exists) {
            throw new HttpsError(
                "not-found",
                "Appeal not found."
            );
        }

        const appeal = appealSnapshot.data();

        if (appeal.status !== "pending") {
            throw new HttpsError(
                "failed-precondition",
                "This appeal has already been reviewed."
            );
        }

        const sanctionRef = db
            .collection("sanctionRecords")
            .doc(appeal.sanctionId);

        const noticeRef = db
            .collection("accountNotices")
            .doc(appeal.accountKey);

        const restrictionRef = db
            .collection("accountRestrictions")
            .doc(appeal.accountKey);

        const sanctionSnapshot =
            await transaction.get(sanctionRef);

        const noticeSnapshot =
            await transaction.get(noticeRef);

        const restrictionSnapshot =
            await transaction.get(restrictionRef);

        if (!sanctionSnapshot.exists) {
            throw new HttpsError(
                "not-found",
                "The original sanction could not be found."
            );
        }

        const sanction = sanctionSnapshot.data();

        transaction.update(appealRef, {
            status: decision,
            reviewNote: reviewNote.trim(),
            reviewedBy: request.auth.uid,
            reviewedAt: FieldValue.serverTimestamp()
        });

        transaction.update(sanctionRef, {
            status: decision === "reversed"
                ? "revoked"
                : "active",
            appealStatus: decision,
            reviewedBy: request.auth.uid,
            reviewNote: reviewNote.trim(),
            reviewedAt: FieldValue.serverTimestamp()
        });

        if (
            decision === "reversed" &&
            sanction.action === "suspend_7d" &&
            restrictionSnapshot.exists &&
            restrictionSnapshot.data().sanctionId === appeal.sanctionId
        ) {
            transaction.delete(restrictionRef);
        }

        if (
            noticeSnapshot.exists &&
            noticeSnapshot.data().sanctionId === appeal.sanctionId
        ) {
            transaction.update(noticeRef, {
                status: decision === "reversed"
                    ? "revoked"
                    : "active",
                appealStatus: decision,
                reviewNote: reviewNote.trim()
            });
        }

        transaction.create(auditRef, {
            sanctionId: appeal.sanctionId,
            appealId,
            action: "appeal_review",
            decision,
            reviewNote: reviewNote.trim(),
            adminUid: request.auth.uid,
            createdAt: FieldValue.serverTimestamp()
        });

    });

    return {
        success: true,
        message: decision === "reversed"
            ? "Appeal accepted. The sanction has been revoked."
            : "Appeal reviewed. The original sanction remains active."
    };

});

// ==========================================
// BHARATCODE AI - FACILITY INSIGHTS
// ==========================================

exports.generateAIFacilityInsights = onCall(
    { timeoutSeconds: 120 },
    async (request) => {

        // Only admins can generate AI insights
        await verifyAdmin(request);

        const apiKey = process.env.BHARATCODE_API_KEY;

        if (!apiKey) {
            throw new HttpsError(
                "failed-precondition",
                "BharatCode API key is missing. Check functions/.env."
            );
        }

        // Read feedback and calculate aggregate statistics.
        // Individual comments and student identities are never sent to AI.
        const feedbackSnapshot = await db
            .collection("feedbackInbox")
            .get();

        const facilityNames = {
            mess: "Mess & Food",
            laundry: "Laundry",
            wifi: "Wi-Fi & Internet",
            room: "Room Facilities",
            water: "Water Facilities",
            sports: "Campus & Sports"
        };

        const stats = {};

        FACILITIES.forEach((facility) => {
            stats[facility] = {
                count: 0,
                total: 0,
                distribution: {
                    1: 0,
                    2: 0,
                    3: 0,
                    4: 0,
                    5: 0
                }
            };
        });

        feedbackSnapshot.forEach((doc) => {
            const data = doc.data();
            const facility = data.facility;
            const rating = Number(data.rating);

            if (
                FACILITIES.includes(facility) &&
                Number.isInteger(rating) &&
                rating >= 1 &&
                rating <= 5
            ) {
                stats[facility].count++;
                stats[facility].total += rating;
                stats[facility].distribution[rating]++;
            }
        });

        // Hide facility metrics until the minimum threshold is reached.
        const overview = FACILITIES.map((facility) => {
            const item = stats[facility];

            if (item.count < 5) {
                return {
                    facility: facilityNames[facility],
                    sufficientData: false
                };
            }

            return {
                facility: facilityNames[facility],
                sufficientData: true,
                totalSubmissions: item.count,
                averageRating: Number(
                    (item.total / item.count).toFixed(2)
                ),
                ratingDistribution: item.distribution
            };
        });

        // Read only issue counts and statuses.
        const issueSnapshot = await db
            .collection("facilityIssues")
            .get();

        const allowedStatuses = [
            "under_review",
            "action_planned",
            "resolved"
        ];

        const issues = [];

        issueSnapshot.forEach((doc) => {
            const data = doc.data();

            if (
                FACILITIES.includes(data.facility) &&
                Number(data.reportCount) >= ISSUE_REPORT_THRESHOLD &&
                allowedStatuses.includes(data.status)
            ) {
                issues.push({
                    facility: facilityNames[data.facility],
                    reportCount: Number(data.reportCount),
                    status: data.status
                });
            }
        });

        const promptData = {
            facilityOverview: overview,
            facilityIssues: issues
        };

        // Send aggregate data to BharatCode.
        let response;

        try {
            response = await fetch(
                "https://bharatcode.ai/api/model/v1/responses",
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "qwen-3.8-27b",
                        store: false,
                        max_output_tokens: 1200,
                        reasoning: {
                            effort: "none"
                        },
                        instructions:
                            "You are a university hostel facility operations analyst. " +
                            "Analyze only the supplied aggregate data. " +
                            "Do not invent facts or assume causes. " +
                            "Clearly identify facilities with insufficient data. " +
                            "Provide these headings: Overall Picture, " +
                            "Facilities Needing Attention, Practical Recommendations, " +
                            "Limitations. Rank concerns using ratings and issue counts. " +
                            "Recommendations are suggestions only, not actions taken. " +
                            "Never infer student identities or claim to have read comments.",
                        input:
                            "Analyze these aggregated facility statistics:\n" +
                            JSON.stringify(promptData)
                    }),
                    signal: AbortSignal.timeout(90000)
                }
            );
        } catch (error) {
            console.error(
                "BharatCode connection error:",
                error.name || "Unknown error"
            );

            throw new HttpsError(
                "unavailable",
                "Unable to reach BharatCode. Please try again."
            );
        }

        if (!response.ok) {
            const requestId =
                response.headers.get("x-request-id") || "not-provided";

            console.error(
                "BharatCode API error:",
                response.status,
                requestId
            );

            if (response.status === 401 || response.status === 403) {
                throw new HttpsError(
                    "permission-denied",
                    "BharatCode rejected the API key or API access."
                );
            }

            if (response.status === 429) {
                throw new HttpsError(
                    "resource-exhausted",
                    "BharatCode rate limit reached. Try again later."
                );
            }

            throw new HttpsError(
                "unavailable",
                "BharatCode could not generate insights. Please try again."
            );
        }

        let result;

        try {
            result = await response.json();
        } catch (error) {
            throw new HttpsError(
                "internal",
                "BharatCode returned an invalid response."
            );
        }

        const insights = Array.isArray(result.output)
            ? result.output
                .filter((item) => item.type === "message")
                .flatMap((item) =>
                    Array.isArray(item.content) ? item.content : []
                )
                .filter((part) =>
                    part.type === "output_text" &&
                    typeof part.text === "string"
                )
                .map((part) => part.text)
                .join("\n")
                .trim()
            : "";

        if (!insights) {
            throw new HttpsError(
                "internal",
                "BharatCode returned an empty response."
            );
        }

        return {
            success: true,
            insights: insights
        };
    }
);
