/**
 * Firebase Modular Configuration
 * Dynamically loads Firebase Auth SDK on-demand and provides clean cloud config.
 * Cloud data synchronization uses direct Firestore v1 REST API over HTTPS fetch
 * to completely avoid Safari/WebKit IndexedDB and WebChannel assertion bugs.
 */
export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAuLNUU58o9-lQ0On8XIqZZ1IIZ24zqGEE",
    authDomain: "element-speller-amitjoshi2724.firebaseapp.com",
    projectId: "element-speller-amitjoshi2724",
    storageBucket: "element-speller-amitjoshi2724.firebasestorage.app",
    messagingSenderId: "743497690246",
    appId: "1:743497690246:web:63a9177a17be8951d03507",
    measurementId: "G-JQP8CHKRGR"
};

let _app = null;
let _auth = null;
let _googleProvider = null;
let _initPromise = null;

/**
 * Purge any cached external API entries (e.g. firestore.googleapis.com) that
 * an older Service Worker may have accidentally stored in Cache Storage.
 */
export async function purgeExternalApiCaches() {
    if (typeof window === "undefined" || !("caches" in window)) return;
    try {
        const names = await window.caches.keys();
        await Promise.all(names.map(async (name) => {
            const cache = await window.caches.open(name);
            const keys = await cache.keys();
            await Promise.all(keys.map((req) => {
                if (
                    req.url.includes("googleapis.com") ||
                    req.url.includes("firebase") ||
                    req.url.includes("gstatic.com")
                ) {
                    return cache.delete(req);
                }
                return Promise.resolve();
            }));
        }));
    } catch (e) {
        // Ignore cache cleanup errors
    }
}

/**
 * Clean up any corrupted legacy @firebase/firestore IndexedDB databases in Safari/WebKit
 */
async function cleanupLegacyFirestoreIndexedDB() {
    if (typeof window === "undefined" || !("indexedDB" in window)) return;
    try {
        if (typeof window.indexedDB.databases === "function") {
            const dbs = await window.indexedDB.databases();
            for (const dbInfo of dbs) {
                if (dbInfo && dbInfo.name && dbInfo.name.includes("firestore")) {
                    try {
                        window.indexedDB.deleteDatabase(dbInfo.name);
                    } catch (e) {}
                }
            }
        }
    } catch (e) {}
}

export async function getFirebaseServices() {
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
        try {
            await purgeExternalApiCaches();
            cleanupLegacyFirestoreIndexedDB();

            const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
            const { getAuth, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

            _app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
            _auth = getAuth(_app);
            _googleProvider = new GoogleAuthProvider();
            _googleProvider.setCustomParameters({ prompt: 'select_account' });

            return {
                app: _app,
                auth: _auth,
                db: null,
                googleProvider: _googleProvider,
                isAvailable: true
            };
        } catch (err) {
            console.warn("Firebase SDK unreachable (running in local offline mode):", err);
            return {
                app: null,
                auth: null,
                db: null,
                googleProvider: null,
                isAvailable: false
            };
        }
    })();
    return _initPromise;
}

export function getAppInstance() { return _app; }
export function getAuthInstance() { return _auth; }
export function getDbInstance() { return null; }
export function getGoogleProvider() { return _googleProvider; }
