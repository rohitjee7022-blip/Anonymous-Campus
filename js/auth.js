
import { auth,functions} from "./firebase.js";
import {
    httpsCallable
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-functions.js";

import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// College email domain
const COLLEGE_DOMAIN = "@iiitsonepat.ac.in";

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("authMessage");
const checkAdminAccess = httpsCallable(
    functions,
    "checkAdminAccess"
);

function showMessage(text) {
    if (message) {
        message.textContent = text;
    }
}

// Show or hide password
window.togglePassword = function (inputId, button) {
    const passwordInput = document.getElementById(inputId);

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        button.textContent = "🙈";
    } else {
        passwordInput.type = "password";
        button.textContent = "👁";
    }
};

// Student registration
if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("studentEmail").value.trim().toLowerCase();
        const password = document.getElementById("studentPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (!email.endsWith(COLLEGE_DOMAIN)) {
            showMessage("Please use your IIIT Sonepat college email address.");
            return;
        }

        if (password !== confirmPassword) {
            showMessage("Passwords do not match.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


            await sendEmailVerification(userCredential.user);

            showMessage("Account created! Please verify your email using the link sent to your inbox.");

            await signOut(auth);
            registerForm.reset();

        } catch (error) {
            showMessage(error.message);
        }
    });
}

// Student login
// Login with role-based redirection
if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim().toLowerCase();
        const password = document.getElementById("loginPassword").value;

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            if (!userCredential.user.emailVerified) {
                await signOut(auth);
                showMessage("Please verify your email before logging in.");
                return;
            }

            showMessage("Login successful! Checking account access...");

            const result = await checkAdminAccess();

            if (result.data.isAdmin) {
                window.location.href = "./admin.html";
            } else {
                window.location.href = "./dashboard.html";
            }

        } catch (error) {
            console.error("Login error:", error);
            showMessage("Login failed. Please check your email and password.");
        }
    });
}

// Forgot password
const forgotPassword = document.getElementById("forgotPassword");

if (forgotPassword) {
    forgotPassword.addEventListener("click", async function (event) {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim().toLowerCase();

        if (!email) {
            showMessage("Please enter your college email first.");
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);

            showMessage("Password reset link sent! Please check your email.");

        } catch (error) {
            showMessage("Unable to send reset email. Please check the email address.");
        }
    });
}
