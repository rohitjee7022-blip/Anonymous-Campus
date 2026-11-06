
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
    getAuth,
    connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
    getFirestore,
    connectFirestoreEmulator
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

import {
    getFunctions,
    connectFunctionsEmulator
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-functions.js";

// Keep your existing Firebase project configuration here.
const firebaseConfig = {
    apiKey: "AIzaSyB9zh6hOeLk_BPM9ER1z57kJNtkeYC8pPg",
    authDomain: "anonymous-campus-bda6b.firebaseapp.com",
    projectId: "anonymous-campus-bda6b",
    storageBucket: "anonymous-campus-bda6b.firebasestorage.app",
    messagingSenderId: "1025656633149",
    appId: "1:1025656633149:web:ea7725e9737cca7f5ff754",
    measurementId: "G-0KSMK4Y7YC"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
) {
    connectAuthEmulator(auth, "http://127.0.0.1:9098");
    connectFirestoreEmulator(db, "127.0.0.1", 8081);
    connectFunctionsEmulator(functions, "127.0.0.1", 5002);

    console.log("Connected to Firebase Local Emulators");
}


