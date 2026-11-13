/**
 * Element-Speller Friend Challenge & Encrypted Puzzle Link Module
 * Allows creating a random 6-word puzzle and sending it to a friend over text/SMS.
 * The words are encrypted with RC4 stream cipher and a randomized 4-byte salt,
 * ensuring no human, preview bot, or link scanner can see the words in plaintext.
 */
import { isSpellable } from "./speller.js?v=1.4.5";
import { getRandomWords } from "./prng.js?v=1.4.5";

const CHALLENGE_SECRET = "ElementSpeller$SecretKey#Challenge2026!";
const MAGIC_BYTE_1 = 0xEC; // "E"
const MAGIC_BYTE_2 = 0x53; // "S"

/**
 * Symmetric RC4 Stream Cipher
 */
function rc4(keyBytes, inputBytes) {
    const s = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        s[i] = i;
    }
    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + s[i] + keyBytes[i % keyBytes.length]) & 255;
        const tmp = s[i];
        s[i] = s[j];
        s[j] = tmp;
    }
    let i = 0;
    j = 0;
    const output = new Uint8Array(inputBytes.length);
    for (let k = 0; k < inputBytes.length; k++) {
        i = (i + 1) & 255;
        j = (j + s[i]) & 255;
        const tmp = s[i];
        s[i] = s[j];
        s[j] = tmp;
        const t = (s[i] + s[j]) & 255;
        output[k] = inputBytes[k] ^ s[t];
    }
    return output;
}

/**
 * URL-Safe Base64 helpers
 */
function bytesToBase64Url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str) {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
        base64 += "=";
    }
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
}

/**
 * Encrypt an array of words into an encrypted URL token.
 * Words are separated by comma, prefixed with magic header, and encrypted with RC4
 * keyed with a random 4-byte salt + secret passphrase.
 *
 * @param {string[]} words - Array of uppercase words (e.g. 6 words)
 * @returns {string} URL-safe encrypted challenge token
 */
export function encodeChallengeWords(words) {
    if (!Array.isArray(words) || words.length === 0) return null;

    const cleanWords = words.map(w => String(w || "").trim().toUpperCase()).filter(Boolean);
    if (cleanWords.length === 0) return null;

    // Generate random 4-byte salt so every link generated is unique
    const salt = new Uint8Array(4);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(salt);
    } else {
        for (let i = 0; i < 4; i++) {
            salt[i] = Math.floor(Math.random() * 256);
        }
    }

    // Key = salt + secret
    const encoder = new TextEncoder();
    const secBytes = encoder.encode(CHALLENGE_SECRET);
    const key = new Uint8Array(salt.length + secBytes.length);
    key.set(salt, 0);
    key.set(secBytes, salt.length);

    // Payload = Magic Header (2 bytes) + UTF-8 words string
    const textBytes = encoder.encode(cleanWords.join(","));
    const payload = new Uint8Array(2 + textBytes.length);
    payload[0] = MAGIC_BYTE_1;
    payload[1] = MAGIC_BYTE_2;
    payload.set(textBytes, 2);

    // Encrypt
    const cipher = rc4(key, payload);

    // Combined = Salt (4 bytes) + Ciphertext
    const combined = new Uint8Array(salt.length + cipher.length);
    combined.set(salt, 0);
    combined.set(cipher, salt.length);

    return bytesToBase64Url(combined);
}

/**
 * Decrypt a challenge token back into an array of words.
 *
 * @param {string} token - The encrypted URL token
 * @returns {string[]|null} Decrypted array of uppercase words or null if invalid
 */
export function decodeChallengeWords(token) {
    if (!token || typeof token !== "string") return null;

    try {
        const cleanToken = token.trim();
        const combined = base64UrlToBytes(cleanToken);
        if (combined.length < 7) return null; // 4 salt + 2 magic + at least 1 char

        const salt = combined.slice(0, 4);
        const cipher = combined.slice(4);

        const encoder = new TextEncoder();
        const secBytes = encoder.encode(CHALLENGE_SECRET);
        const key = new Uint8Array(salt.length + secBytes.length);
        key.set(salt, 0);
        key.set(secBytes, salt.length);

        const decrypted = rc4(key, cipher);
        if (decrypted[0] !== MAGIC_BYTE_1 || decrypted[1] !== MAGIC_BYTE_2) {
            return null; // Bad magic header / corrupted key
        }

        const decoder = new TextDecoder();
        const text = decoder.decode(decrypted.slice(2));
        const words = text.split(",").map(w => w.trim().toUpperCase()).filter(Boolean);

        if (words.length === 0 || words.length > 12) return null;

        // Verify each word is valid letters and spellable
        for (const w of words) {
            if (!/^[A-Z]{1,20}$/.test(w)) return null;
            if (!isSpellable(w)) return null;
        }

        return words;
    } catch (e) {
        console.warn("Could not decode challenge token:", e);
        return null;
    }
}

/**
 * Build the full shareable URL for a challenge token
 */
export function buildChallengeURL(token) {
    if (!token) return "";
    try {
        const loc = window.location;
        const origin = loc.origin && loc.origin !== "null" ? loc.origin : "";
        const pathname = loc.pathname || "/";
        return `${origin}${pathname}?challenge=${encodeURIComponent(token)}`;
    } catch (e) {
        return `?challenge=${encodeURIComponent(token)}`;
    }
}

/**
 * Build the friendly text message to send over text/SMS/iMessage
 */
export function buildChallengeMessage({ url, solveTimeMs = null, formattedTime = null, wordCount = 6 }) {
    const timeStr = formattedTime || (solveTimeMs ? formatTimeMs(solveTimeMs) : null);
    if (timeStr) {
        return `🧪 I challenge you to Element-Speller! I solved all ${wordCount} words in ${timeStr} — can you beat my time?

Play our puzzle here:
${url}`;
    }
    return `🧪 I challenge you to Element-Speller! Can you spell all ${wordCount} words using chemical elements faster than me?

Play our puzzle here:
${url}`;
}

/**
 * Share or copy challenge to clipboard
 */
export async function shareChallengePayload({ title, text, url }) {
    const fullText = `${text}\n\n${url}`;

    // 1. Try native Web Share API (mobile Safari / Chrome share sheet)
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
            await navigator.share({
                title: title || "Element-Speller Challenge",
                text: text,
                url: url
            });
            return { success: true, method: "share" };
        } catch (e) {
            // User cancelled or share failed, fallback to copy
            if (e.name === "AbortError") {
                return { success: false, cancelled: true };
            }
        }
    }

    // 2. Fallback: Copy full challenge message + URL to clipboard
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(fullText);
            return { success: true, method: "clipboard" };
        }
    } catch (e) {}

    // 3. Fallback textarea copy for older webviews/iOS
    try {
        const ta = document.createElement("textarea");
        ta.value = fullText;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) return { success: true, method: "clipboard" };
    } catch (e) {}

    return { success: false, method: "none" };
}

/**
 * Generate a fresh random 6-word challenge set
 */
export function generateRandomChallengeWords(count = 6) {
    const res = getRandomWords(count);
    return res.words;
}
