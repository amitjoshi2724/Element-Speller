/**
 * ElementSpeller - Dual-Layer Storage & Cloud Sync Module (v1.4.5)
 * Offline-first localStorage with direct Firestore v1 REST API cloud synchronization.
 * Uses pure HTTPS fetch (POST :batchGet & PATCH) with Firebase Auth ID tokens,
 * completely eliminating Safari/WebKit @firebase/firestore IndexedDB & WebChannel bugs.
 */
import { onAuthChange, getCurrentUser } from "./auth.js?v=1.4.5";
import { FIREBASE_CONFIG, purgeExternalApiCaches } from "./firebase-config.js?v=1.4.5";
import { getPuzzleNumber, getDailyWords, getTodayDateStr, SIX_WORD_ERA_START_DATE } from "./prng.js?v=1.4.5";

const STATS_KEY = "elementspeller_stats_v1";
const HISTORY_KEY = "elementspeller_history_v1";
const PRACTICE_HISTORY_KEY = "elementspeller_practice_history_v1";
const ACTIVE_KEY = "elementspeller_active_state_v1";
const DELETED_DATES_KEY = "elementspeller_deleted_dates_v1";
const DAILY_PROGRESS_PREFIX = "elementspeller_progress_v2_";

export const DEFAULT_STATS = {
    played: 0,
    won: 0,
    currentStreak: 0,
    maxStreak: 0,
    bestTimeMs: null,
    totalTimeMs: 0,
    totalHintsUsed: 0,
    meanSolveTimeMs: null,
    practicePlayed: 0,
    practiceWon: 0,
    lastPlayedDate: null,
    // Solve time distribution bins
    distribution: {
        "< 10s": 0,
        "10-20s": 0,
        "20-30s": 0,
        "30-60s": 0,
        "1-2m": 0,
        "> 2m": 0
    }
};

function withTimeout(promise, ms = 8000, errorMsg = "Cloud request timed out") {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    });
    return Promise.race([
        promise.then(res => { clearTimeout(timer); return res; }, err => { clearTimeout(timer); throw err; }),
        timeout
    ]);
}

/**
 * Convert a plain JS value into Firestore v1 REST Value format
 */
function toFirestoreValue(val) {
    if (val === null || val === undefined) {
        return { nullValue: null };
    }
    if (typeof val === "boolean") {
        return { booleanValue: val };
    }
    if (typeof val === "number") {
        if (!Number.isFinite(val)) return { nullValue: null };
        if (Number.isInteger(val)) return { integerValue: String(val) };
        return { doubleValue: val };
    }
    if (typeof val === "string") {
        return { stringValue: val };
    }
    if (Array.isArray(val)) {
        return { arrayValue: { values: val.map(v => toFirestoreValue(v)) } };
    }
    if (typeof val === "object") {
        const fields = {};
        for (const [k, v] of Object.entries(val)) {
            if (v !== undefined) {
                fields[k] = toFirestoreValue(v);
            }
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
}

/**
 * Convert a Firestore v1 REST Value object back into a plain JS value
 */
function fromFirestoreValue(fv) {
    if (!fv || typeof fv !== "object") return null;
    if ("nullValue" in fv) return null;
    if ("booleanValue" in fv) return Boolean(fv.booleanValue);
    if ("integerValue" in fv) return Number(fv.integerValue);
    if ("doubleValue" in fv) return Number(fv.doubleValue);
    if ("stringValue" in fv) return String(fv.stringValue);
    if ("timestampValue" in fv) return fv.timestampValue;
    if ("arrayValue" in fv) {
        const vals = fv.arrayValue?.values;
        return Array.isArray(vals) ? vals.map(fromFirestoreValue) : [];
    }
    if ("mapValue" in fv) {
        const fields = fv.mapValue?.fields;
        if (!fields || typeof fields !== "object") return {};
        const out = {};
        for (const [k, v] of Object.entries(fields)) {
            out[k] = fromFirestoreValue(v);
        }
        return out;
    }
    return null;
}

function fromFirestoreDocument(docJson) {
    if (!docJson || !docJson.fields) return {};
    const out = {};
    for (const [k, v] of Object.entries(docJson.fields)) {
        out[k] = fromFirestoreValue(v);
    }
    return out;
}

/**
 * Get a valid Firebase Auth ID token for REST requests
 */
async function getAuthToken(user, forceRefresh = false) {
    if (!user || typeof user.getIdToken !== "function") return null;
    try {
        return await withTimeout(user.getIdToken(forceRefresh), 5000, "Auth token timeout");
    } catch (e) {
        console.warn("Failed to get auth token:", e);
        return null;
    }
}

/**
 * Fetch user document from Cloud Firestore via v1 REST API.
 * Uses POST :batchGet first (which never gets intercepted by any GET Service Worker cache),
 * with automatic fallback to GET after purging any external API cache.
 */
async function fetchCloudUserDoc(user) {
    let token = await getAuthToken(user, false);
    if (!token) throw new Error("Not authenticated");

    const projectId = FIREBASE_CONFIG.projectId;
    const docPath = `projects/${projectId}/databases/(default)/documents/users/${user.uid}`;
    const batchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:batchGet`;

    const doBatchGet = async (bearerToken) => {
        return await withTimeout(fetch(batchUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${bearerToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ documents: [docPath] }),
            cache: "no-store"
        }), 7000, "Cloud fetch timed out");
    };

    try {
        let res = await doBatchGet(token);
        if (res.status === 401) {
            token = await getAuthToken(user, true);
            if (token) res = await doBatchGet(token);
        }
        if (res.ok) {
            const arr = await res.json();
            const first = Array.isArray(arr) ? arr[0] : arr;
            if (first && first.found) {
                return { exists: true, data: fromFirestoreDocument(first.found) };
            }
            if (first && first.missing) {
                return { exists: false, data: {} };
            }
        }
    } catch (batchErr) {
        console.warn("Firestore batchGet fallback to GET:", batchErr);
    }

    // Fallback to direct GET after purging any cached googleapis.com responses
    await purgeExternalApiCaches();
    const getUrl = `https://firestore.googleapis.com/v1/${docPath}?_t=${Date.now()}`;
    const getRes = await withTimeout(fetch(getUrl, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        cache: "no-store"
    }), 7000, "Cloud fetch timed out");
    await purgeExternalApiCaches();

    if (getRes.status === 404) {
        return { exists: false, data: {} };
    }
    if (!getRes.ok) {
        const errText = await getRes.text().catch(() => "");
        throw new Error(`Firestore HTTP ${getRes.status}: ${errText.slice(0, 120)}`);
    }
    const docJson = await getRes.json();
    return { exists: true, data: fromFirestoreDocument(docJson) };
}

/**
 * Patch fields on user document in Cloud Firestore via v1 REST API.
 */
async function patchCloudUserDoc(user, fieldsObj) {
    let token = await getAuthToken(user, false);
    if (!token) throw new Error("Not authenticated");

    const projectId = FIREBASE_CONFIG.projectId;
    const keys = Object.keys(fieldsObj).filter(k => fieldsObj[k] !== undefined);
    if (keys.length === 0) return { success: true };

    const maskParams = keys
        .map(k => {
            const safeKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) ? k : `\`${k.replace(/`/g, "\\`")}\``;
            return `updateMask.fieldPaths=${encodeURIComponent(safeKey)}`;
        })
        .join("&");

    const patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(user.uid)}?${maskParams}`;

    const firestoreFields = {};
    for (const k of keys) {
        firestoreFields[k] = toFirestoreValue(fieldsObj[k]);
    }
    const bodyStr = JSON.stringify({ fields: firestoreFields });

    const doPatch = async (bearerToken) => {
        return await withTimeout(fetch(patchUrl, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${bearerToken}`,
                "Content-Type": "application/json"
            },
            body: bodyStr,
            cache: "no-store"
        }), 7000, "Cloud save timed out");
    };

    let res = await doPatch(token);
    if (res.status === 401) {
        token = await getAuthToken(user, true);
        if (token) res = await doPatch(token);
    }

    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Firestore save HTTP ${res.status}: ${errText.slice(0, 120)}`);
    }
    return { success: true };
}

export function getTimeBin(ms) {
    if (!ms || ms <= 0) return "> 2m";
    const sec = ms / 1000;
    if (sec < 10) return "< 10s";
    if (sec < 20) return "10-20s";
    if (sec < 30) return "20-30s";
    if (sec < 60) return "30-60s";
    if (sec < 120) return "1-2m";
    return "> 2m";
}

export function formatTimeMs(ms) {
    if (!ms || ms <= 0) return "--";
    const totalSec = ms / 1000;
    if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m}m ${s}s`;
}

/**
 * Ensure any daily record (local or legacy cloud) has complete, consistent fields
 */
function normalizeDailyRecord(dateStr, rec) {
    if (!rec || typeof rec !== "object" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const isSingle = dateStr < SIX_WORD_ERA_START_DATE;
    const expectedCount = isSingle ? 1 : 6;
    const dailyInfo = getDailyWords(dateStr, expectedCount);

    const rawNum = String(rec.puzzleNum || dailyInfo.puzzleNumber).replace(/^#/, "");
    const puzzleNum = Number(rawNum) || dailyInfo.puzzleNumber;

    let words = (Array.isArray(rec.words) && rec.words.length > 0)
        ? rec.words
        : (rec.word ? [rec.word] : dailyInfo.words);
    const primaryWord = rec.word || words[0] || dailyInfo.words[0];

    const solveTimeMs = (rec.solveTimeMs && Number(rec.solveTimeMs) > 0)
        ? Number(rec.solveTimeMs)
        : null;

    return {
        ...rec,
        dateStr,
        puzzleNum,
        word: primaryWord,
        words,
        won: Boolean(rec.won),
        solveTimeMs,
        hintsUsed: Number(rec.hintsUsed || 0),
        wordRecords: Array.isArray(rec.wordRecords) ? rec.wordRecords : null,
        elementsUsed: Array.isArray(rec.elementsUsed)
            ? rec.elementsUsed
            : (rec.wordRecords?.[0]?.placedElements || []),
        timestamp: Number(rec.timestamp || new Date(dateStr + "T12:00:00Z").getTime())
    };
}

function loadDeletedDates() {
    try {
        const raw = localStorage.getItem(DELETED_DATES_KEY);
        if (raw) return JSON.parse(raw) || {};
    } catch (e) {}
    return {};
}

function saveDeletedDates(map) {
    try {
        localStorage.setItem(DELETED_DATES_KEY, JSON.stringify(map));
    } catch (e) {}
}

let memoryDeletedDates = loadDeletedDates();
let memoryHistory = loadLocalHistory();
let memoryPracticeHistory = loadLocalPracticeHistory();
let memoryStats = sanitizeStats(loadLocalStats(), memoryHistory, memoryPracticeHistory);

try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
    localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
} catch (e) {}

const storageChangeListeners = new Set();

export function onStorageChange(callback) {
    storageChangeListeners.add(callback);
    return () => storageChangeListeners.delete(callback);
}

function notifyListeners() {
    storageChangeListeners.forEach(cb => {
        try {
            cb({ stats: memoryStats, history: memoryHistory, practiceHistory: memoryPracticeHistory });
        } catch (e) {
            console.error("Error in storage listener:", e);
        }
    });
}

// Cross-tab / multi-window storage sync for desktop & browsers
if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
        if (e.key === HISTORY_KEY || e.key === PRACTICE_HISTORY_KEY || e.key === STATS_KEY || e.key === DELETED_DATES_KEY) {
            memoryDeletedDates = loadDeletedDates();
            memoryHistory = loadLocalHistory();
            memoryPracticeHistory = loadLocalPracticeHistory();
            memoryStats = sanitizeStats(loadLocalStats(), memoryHistory, memoryPracticeHistory);
            notifyListeners();
        }
    });
}

export function loadLocalPracticeHistory() {
    try {
        const raw = localStorage.getItem(PRACTICE_HISTORY_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.error("Failed to parse local practice history:", e);
    }
    return [];
}

export function getPracticeHistory() {
    return [...memoryPracticeHistory];
}

export function loadLocalStats() {
    try {
        let raw = localStorage.getItem(STATS_KEY);
        if (!raw) {
            raw = localStorage.getItem("elementle_stats_v1");
            if (raw) localStorage.setItem(STATS_KEY, raw);
        }
        if (raw) return { ...DEFAULT_STATS, ...JSON.parse(raw) };
    } catch (e) {
        console.error("Failed to parse local stats:", e);
    }
    return { ...DEFAULT_STATS };
}

export function loadLocalHistory() {
    try {
        let raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) {
            raw = localStorage.getItem("elementle_history_v1");
            if (raw) localStorage.setItem(HISTORY_KEY, raw);
        }
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                const normalized = {};
                for (const [d, r] of Object.entries(parsed)) {
                    const norm = normalizeDailyRecord(d, r);
                    if (norm) normalized[d] = norm;
                }
                return normalized;
            }
        }
    } catch (e) {
        console.error("Failed to parse local history:", e);
    }
    return {};
}

function computeStreaksFromHistory(history) {
    const todayStr = getTodayDateStr();
    const dates = Object.keys(history || {}).filter(d => d <= todayStr).sort();
    if (dates.length === 0) return { currentStreak: 0, maxStreak: 0 };

    let maxStreak = 0;
    let tempStreak = 0;
    let prevDate = null;

    for (const d of dates) {
        const rec = history[d];
        if (!rec || !rec.won) {
            tempStreak = 0;
            prevDate = d;
            continue;
        }

        if (!prevDate) {
            tempStreak = 1;
        } else {
            const p = new Date(prevDate + "T00:00:00Z");
            const c = new Date(d + "T00:00:00Z");
            const diffDays = Math.round((c - p) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }
        }
        if (tempStreak > maxStreak) maxStreak = tempStreak;
        prevDate = d;
    }

    const lastDate = dates[dates.length - 1];
    const p = new Date(lastDate + "T00:00:00Z");
    const t = new Date(todayStr + "T00:00:00Z");
    const diffFromToday = Math.round((t - p) / (1000 * 60 * 60 * 24));
    const currentStreak = (diffFromToday <= 1 && history[lastDate]?.won) ? tempStreak : 0;

    return { currentStreak, maxStreak };
}

function sanitizeStats(stats, history, practiceHistory = memoryPracticeHistory) {
    const clean = { ...DEFAULT_STATS, ...(stats || {}) };
    clean.distribution = { ...DEFAULT_STATS.distribution, ...(clean.distribution || {}) };

    const dailyEntries = Object.values(history || {});
    const practiceEntries = practiceHistory || [];

    let won = 0;
    let totalTime = 0;
    let totalHints = 0;
    let bestTime = null;
    const dist = {
        "< 10s": 0,
        "10-20s": 0,
        "20-30s": 0,
        "30-60s": 0,
        "1-2m": 0,
        "> 2m": 0
    };

    for (const r of dailyEntries) {
        if (r && r.won) {
            won++;
            if (r.hintsUsed) totalHints += Number(r.hintsUsed) || 0;
            if (r.solveTimeMs && r.solveTimeMs > 0) {
                totalTime += r.solveTimeMs;
                bestTime = (bestTime === null) ? r.solveTimeMs : Math.min(bestTime, r.solveTimeMs);
                const bin = getTimeBin(r.solveTimeMs);
                dist[bin] = (dist[bin] || 0) + 1;
            }
        }
    }

    let practiceWon = 0;
    for (const pr of practiceEntries) {
        if (pr && pr.won) {
            practiceWon++;
            won++;
            if (pr.hintsUsed) totalHints += Number(pr.hintsUsed) || 0;
            if (pr.solveTimeMs && pr.solveTimeMs > 0) {
                totalTime += pr.solveTimeMs;
                bestTime = (bestTime === null) ? pr.solveTimeMs : Math.min(bestTime, pr.solveTimeMs);
                const bin = getTimeBin(pr.solveTimeMs);
                dist[bin] = (dist[bin] || 0) + 1;
            }
        }
    }

    const totalGames = dailyEntries.length + practiceEntries.length;
    clean.played = totalGames;
    clean.won = won;
    clean.bestTimeMs = bestTime;
    clean.totalTimeMs = totalTime;
    clean.totalHintsUsed = totalHints;
    clean.meanSolveTimeMs = (won > 0 && totalTime > 0) ? Math.round(totalTime / won) : null;
    clean.practicePlayed = practiceEntries.length;
    clean.practiceWon = practiceWon;
    clean.distribution = dist;

    const { currentStreak, maxStreak } = computeStreaksFromHistory(history);
    clean.currentStreak = currentStreak;
    clean.maxStreak = Math.max(clean.maxStreak || 0, maxStreak);

    return clean;
}

export function saveLocalStats(stats, triggerCloudSync = true) {
    memoryStats = sanitizeStats(stats, memoryHistory, memoryPracticeHistory);
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
    } catch (e) {
        console.error("Failed to save local stats:", e);
    }
    if (triggerCloudSync) {
        syncToCloud();
    }
    notifyListeners();
}

let progressSyncTimer = null;

async function syncProgressToCloud(dateStr, progress) {
    const user = getCurrentUser();
    if (!user || !dateStr) return;
    clearTimeout(progressSyncTimer);
    progressSyncTimer = setTimeout(async () => {
        try {
            await patchCloudUserDoc(user, {
                [`elementspeller_progress_${dateStr}`]: sanitizeForFirestore(progress),
                lastUpdated: Date.now()
            });
        } catch (e) {
            console.warn("Could not sync active progress to Firestore:", e);
        }
    }, 600);
}

export function saveDailyProgress(dateStr, progress) {
    if (!dateStr) return;
    try {
        localStorage.setItem(`${DAILY_PROGRESS_PREFIX}${dateStr}`, JSON.stringify({
            dateStr,
            progress,
            timestamp: Date.now()
        }));
    } catch (e) {}
    syncProgressToCloud(dateStr, progress);
}

export function loadDailyProgress(dateStr) {
    if (!dateStr) return null;
    try {
        const raw = localStorage.getItem(`${DAILY_PROGRESS_PREFIX}${dateStr}`);
        if (raw) {
            const data = JSON.parse(raw);
            if (data && data.dateStr === dateStr) return data.progress;
        }
    } catch (e) {}
    return null;
}

export function clearDailyProgress(dateStr) {
    if (!dateStr) return;
    try {
        localStorage.removeItem(`${DAILY_PROGRESS_PREFIX}${dateStr}`);
    } catch (e) {}
    const user = getCurrentUser();
    if (user) {
        patchCloudUserDoc(user, {
            [`elementspeller_progress_${dateStr}`]: null
        }).catch(() => {});
    }
}

/**
 * Deep recursive sanitizer ensuring zero undefined values
 */
export function sanitizeForFirestore(val) {
    if (val === undefined) return null;
    return JSON.parse(JSON.stringify(val, (key, value) => (value === undefined ? null : value)));
}

export async function recordCompletion(dateStr, puzzleNum, wordOrWords, won, elementsUsedOrWordRecords, solveTimeMs, hintsUsed = 0) {
    const existing = memoryHistory[dateStr];
    const isArrayWords = Array.isArray(wordOrWords);
    const incomingCount = isArrayWords ? wordOrWords.length : 1;
    const existingCount = existing?.wordRecords?.length || (existing?.won ? 1 : 0);

    // If previously completed with the exact same word count, preserve best time
    let finalSolveTime = solveTimeMs;
    if (existing && existing.won && existing.solveTimeMs && existingCount === incomingCount) {
        finalSolveTime = Math.min(existing.solveTimeMs, solveTimeMs);
    }

    const words = isArrayWords ? wordOrWords : [wordOrWords];
    const primaryWord = isArrayWords ? wordOrWords[0] : wordOrWords;

    const rawRecord = {
        dateStr,
        puzzleNum: Number(String(puzzleNum).replace(/^#/, "")) || getPuzzleNumber(dateStr),
        word: primaryWord,
        words: words,
        won: true,
        solveTimeMs: finalSolveTime || null,
        hintsUsed: (hintsUsed !== undefined && hintsUsed !== null) ? hintsUsed : (existing?.hintsUsed || 0),
        wordRecords: isArrayWords ? elementsUsedOrWordRecords : null,
        elementsUsed: isArrayWords ? (elementsUsedOrWordRecords?.[0]?.placedElements || []) : elementsUsedOrWordRecords,
        timestamp: Date.now()
    };

    const record = normalizeDailyRecord(dateStr, sanitizeForFirestore(rawRecord));

    // Clear any prior reset marker for this date
    if (memoryDeletedDates[dateStr]) {
        delete memoryDeletedDates[dateStr];
        saveDeletedDates(memoryDeletedDates);
    }

    memoryHistory[dateStr] = record;
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
    } catch (e) {}

    const stats = sanitizeStats(memoryStats, memoryHistory, memoryPracticeHistory);
    stats.lastPlayedDate = dateStr;
    saveLocalStats(stats, false);
    clearActiveState(dateStr);
    clearDailyProgress(dateStr);
    await syncToCloud();
    return record;
}

/**
 * Record a completed practice or challenge game so player can remember and review past games
 */
export function recordPracticeCompletion(words, won, elementsUsedOrWordRecords, solveTimeMs, hintsUsed = 0, mode = "practice", customPuzzleNum = null) {
    const isArrayWords = Array.isArray(words);
    const primaryWord = isArrayWords ? words[0] : words;
    const finalWords = isArrayWords ? words : [words];
    const practiceNum = memoryPracticeHistory.length + 1;
    const dateStr = getTodayDateStr();

    const recordMode = mode || "practice";
    const defaultPuzzleNum = (recordMode === "challenge") ? "Friend Challenge" : `Practice #${practiceNum}`;

    const rawRecord = {
        id: `${recordMode}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        mode: recordMode,
        puzzleNum: customPuzzleNum || defaultPuzzleNum,
        word: primaryWord,
        words: finalWords,
        won: !!won,
        solveTimeMs: solveTimeMs || null,
        hintsUsed: (hintsUsed !== undefined && hintsUsed !== null) ? hintsUsed : 0,
        wordRecords: isArrayWords ? elementsUsedOrWordRecords : null,
        elementsUsed: isArrayWords ? (elementsUsedOrWordRecords?.[0]?.placedElements || []) : elementsUsedOrWordRecords,
        dateStr: dateStr,
        timestamp: Date.now()
    };

    const record = sanitizeForFirestore(rawRecord);

    memoryPracticeHistory.unshift(record);
    if (memoryPracticeHistory.length > 500) {
        memoryPracticeHistory = memoryPracticeHistory.slice(0, 500);
    }

    try {
        localStorage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(memoryPracticeHistory));
    } catch (e) {}

    const stats = sanitizeStats(memoryStats, memoryHistory, memoryPracticeHistory);
    saveLocalStats(stats, false);
    syncToCloud();
    notifyListeners();
    return record;
}

/**
 * Get all completed game records (Daily + Practice) combined and sorted by timestamp descending
 */
export function getAllGameRecords() {
    const dailyRecords = Object.entries(memoryHistory).map(([dateStr, rec]) => {
        const norm = normalizeDailyRecord(dateStr, rec) || rec;
        const cleanNum = String(norm.puzzleNum || getPuzzleNumber(dateStr)).replace(/^#/, "");
        return {
            ...norm,
            id: `daily_${dateStr}`,
            mode: "daily",
            dateStr: dateStr,
            puzzleNum: Number(cleanNum) || cleanNum,
            displayNum: `#${cleanNum}`,
            timestamp: norm.timestamp || (new Date(dateStr + "T12:00:00Z").getTime())
        };
    });
    const practiceRecords = (memoryPracticeHistory || []).map(rec => ({
        ...rec,
        mode: "practice",
        displayNum: rec.puzzleNum || "Practice"
    }));
    return [...dailyRecords, ...practiceRecords].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * Reset a daily puzzle so player can replay and try for a faster time
 */
export async function resetDailyGameResult(dateStr) {
    delete memoryHistory[dateStr];
    memoryDeletedDates[dateStr] = Date.now();
    saveDeletedDates(memoryDeletedDates);

    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
    } catch (e) {}

    clearActiveState(dateStr);
    clearDailyProgress(dateStr);
    memoryStats = sanitizeStats(memoryStats, memoryHistory, memoryPracticeHistory);
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
    } catch (e) {}

    await syncToCloud();
    notifyListeners();
    return true;
}

export function saveActiveState(dateStr, state) {
    try {
        localStorage.setItem(ACTIVE_KEY, JSON.stringify({ dateStr, state, timestamp: Date.now() }));
    } catch (e) {}
}

export function loadActiveState(dateStr) {
    try {
        let raw = localStorage.getItem(ACTIVE_KEY);
        if (!raw) {
            raw = localStorage.getItem("elementle_active_state_v1");
        }
        if (raw) {
            const data = JSON.parse(raw);
            if (data.dateStr === dateStr) return data.state;
        }
    } catch (e) {}
    return null;
}

export function clearActiveState(dateStr) {
    try {
        const raw = localStorage.getItem(ACTIVE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (data.dateStr === dateStr) localStorage.removeItem(ACTIVE_KEY);
        }
        localStorage.removeItem("elementle_active_state_v1");
    } catch (e) {}
}

export function getStats() {
    return sanitizeStats(memoryStats, memoryHistory, memoryPracticeHistory);
}

export function getHistory() {
    return { ...memoryHistory };
}

export function getRecordForDate(dateStr) {
    return memoryHistory[dateStr] || null;
}

/**
 * Merge cloud document data with local memory state without ever losing a solved puzzle
 */
function mergeCloudDataIntoLocal(cloudData) {
    if (!cloudData || typeof cloudData !== "object") return false;

    const cloudStats = cloudData.element_speller_stats || cloudData.elementspeller_stats || cloudData.elementle_stats || {};
    const cloudDeletedDates = cloudData.elementspeller_deleted_dates || {};
    const cloudHistory = {
        ...(cloudData.history || {}),
        ...(cloudData.elementle_history || {}),
        ...(cloudData.element_speller_history || {}),
        ...(cloudData.elementspeller_history || {})
    };

    // 1. Merge deleted/reset timestamps
    for (const [dStr, delTs] of Object.entries(cloudDeletedDates)) {
        if (!delTs) continue;
        const localRec = memoryHistory[dStr];
        if (!localRec || (localRec.timestamp || 0) < delTs) {
            delete memoryHistory[dStr];
            memoryDeletedDates[dStr] = Math.max(memoryDeletedDates[dStr] || 0, Number(delTs));
        }
    }
    saveDeletedDates(memoryDeletedDates);

    // 2. Merge active puzzle progress from cloud
    for (const [key, val] of Object.entries(cloudData)) {
        if (key.startsWith("elementspeller_progress_") && val && typeof val === "object") {
            const dStr = key.replace("elementspeller_progress_", "");
            if (memoryHistory[dStr]?.won) continue; // Already solved
            const localRaw = localStorage.getItem(`${DAILY_PROGRESS_PREFIX}${dStr}`);
            const localData = localRaw ? JSON.parse(localRaw) : null;
            if (!localData || (val.timestamp && val.timestamp > (localData.timestamp || 0))) {
                try {
                    localStorage.setItem(`${DAILY_PROGRESS_PREFIX}${dStr}`, JSON.stringify({
                        dateStr: dStr,
                        progress: val,
                        timestamp: val.timestamp || Date.now()
                    }));
                } catch (e) {}
            }
        }
    }

    // 3. Merge daily history: union of all solved puzzles across devices
    const mergedHistory = { ...memoryHistory };
    for (const [date, rawCloudRec] of Object.entries(cloudHistory)) {
        const rec = normalizeDailyRecord(date, rawCloudRec);
        if (!rec) continue;

        // If explicitly reset more recently than this cloud record, skip resurrecting it
        const delTs = memoryDeletedDates[date];
        if (delTs && delTs > (rec.timestamp || 0)) {
            continue;
        }

        const existing = mergedHistory[date];
        if (!existing) {
            mergedHistory[date] = rec;
        } else if (rec.won) {
            if (!existing.won) {
                mergedHistory[date] = rec;
            } else {
                // Both won: prefer 6-word record on 6-word era dates, then pick fastest solve time
                const existingWordCount = existing.wordRecords?.length || existing.words?.length || 1;
                const incomingWordCount = rec.wordRecords?.length || rec.words?.length || 1;

                if (incomingWordCount > existingWordCount) {
                    mergedHistory[date] = rec;
                } else if (existingWordCount > incomingWordCount) {
                    // Keep existing richer record
                } else {
                    const bestSolveTime = Math.min(
                        existing.solveTimeMs || 999999999,
                        rec.solveTimeMs || 999999999
                    );
                    const finalSolveTime = bestSolveTime === 999999999
                        ? (existing.solveTimeMs || rec.solveTimeMs)
                        : bestSolveTime;
                    const fasterRec = (rec.solveTimeMs && (!existing.solveTimeMs || rec.solveTimeMs <= existing.solveTimeMs))
                        ? rec
                        : existing;

                    mergedHistory[date] = normalizeDailyRecord(date, {
                        ...existing,
                        ...rec,
                        ...fasterRec,
                        won: true,
                        solveTimeMs: finalSolveTime,
                        wordRecords: fasterRec.wordRecords || rec.wordRecords || existing.wordRecords || null,
                        elementsUsed: fasterRec.elementsUsed?.length ? fasterRec.elementsUsed : (rec.elementsUsed?.length ? rec.elementsUsed : (existing.elementsUsed || []))
                    });
                }
            }
        }
    }

    // 4. Merge practice history from cloud
    const cloudPractice = cloudData.elementspeller_practice_history || cloudData.practice_history || [];
    if (Array.isArray(cloudPractice)) {
        const existingIds = new Set(memoryPracticeHistory.map(p => p.id));
        for (const pr of cloudPractice) {
            if (pr && pr.id && !existingIds.has(pr.id)) {
                memoryPracticeHistory.push(pr);
                existingIds.add(pr.id);
            }
        }
        memoryPracticeHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (memoryPracticeHistory.length > 500) {
            memoryPracticeHistory = memoryPracticeHistory.slice(0, 500);
        }
        try {
            localStorage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(memoryPracticeHistory));
        } catch (e) {}
    }

    memoryHistory = mergedHistory;
    memoryStats = sanitizeStats(cloudStats, memoryHistory, memoryPracticeHistory);

    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
    } catch (e) {}

    return true;
}

function buildCloudPayload() {
    const cleanStats = sanitizeStats(memoryStats, memoryHistory, memoryPracticeHistory);
    return sanitizeForFirestore({
        element_speller_stats: cleanStats,
        element_speller_history: memoryHistory,
        elementspeller_stats: cleanStats,
        elementspeller_history: memoryHistory,
        elementspeller_practice_history: memoryPracticeHistory,
        elementspeller_deleted_dates: memoryDeletedDates,
        lastUpdated: Date.now()
    });
}

let activeSyncPromise = null;

/**
 * Sync local state with Firestore using an atomic Read-Merge-Write over REST
 * so no device can ever accidentally overwrite another device's solved puzzles.
 */
export async function syncToCloud() {
    const user = getCurrentUser();
    if (!user) {
        return { success: false, reason: "not_signed_in" };
    }

    try {
        // First fetch & merge any remote solves so we never overwrite another browser's solves
        try {
            const snap = await fetchCloudUserDoc(user);
            if (snap && snap.exists && snap.data) {
                mergeCloudDataIntoLocal(snap.data);
                notifyListeners();
            }
        } catch (readErr) {
            console.warn("Pre-sync cloud read skipped:", readErr);
        }

        const payload = buildCloudPayload();
        await patchCloudUserDoc(user, payload);
        return { success: true, count: Object.keys(memoryHistory).length };
    } catch (e) {
        console.error("Could not sync ElementSpeller data to Firestore:", e);
        return { success: false, error: e.message || String(e) };
    }
}

/**
 * Actively fetch and merge the latest records from Firestore, then push merged union back
 */
export async function refreshFromCloud(user = getCurrentUser()) {
    if (!user) return { success: false, reason: "not_signed_in" };
    if (activeSyncPromise) return activeSyncPromise;

    activeSyncPromise = (async () => {
        try {
            const snap = await fetchCloudUserDoc(user);

            if (snap && snap.exists && snap.data) {
                mergeCloudDataIntoLocal(snap.data);
                notifyListeners();

                // Heal/push union back to cloud in background
                const payload = buildCloudPayload();
                patchCloudUserDoc(user, payload).catch(err =>
                    console.warn("Background merge back to cloud warning:", err)
                );

                return { success: true, count: Object.keys(memoryHistory).length };
            } else {
                // First time login for this user: seed cloud with current local stats
                const payload = buildCloudPayload();
                await patchCloudUserDoc(user, payload);
                return { success: true, count: Object.keys(memoryHistory).length };
            }
        } catch (e) {
            console.error("Could not refresh from Firestore:", e);
            return { success: false, error: e.message || String(e) };
        } finally {
            activeSyncPromise = null;
        }
    })();

    return activeSyncPromise;
}

/**
 * Listen for auth changes and window/tab focus to keep all browsers & Dock PWA in sync automatically
 */
let lastAutoRefreshTime = 0;

async function triggerAutoCloudRefresh() {
    const user = getCurrentUser();
    if (!user) return;
    const now = Date.now();
    if (now - lastAutoRefreshTime < 2500) return;
    lastAutoRefreshTime = now;
    try {
        await refreshFromCloud(user);
    } catch (e) {}
}

onAuthChange(async (user) => {
    if (!user) {
        notifyListeners();
        return;
    }
    lastAutoRefreshTime = Date.now();
    await refreshFromCloud(user);
});

if (typeof window !== "undefined") {
    // Sync immediately whenever switching back to this browser / tab / macOS Dock app
    window.addEventListener("focus", () => {
        triggerAutoCloudRefresh();
    });

    window.addEventListener("online", () => {
        triggerAutoCloudRefresh();
    });

    if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                triggerAutoCloudRefresh();
            }
        });

        // Periodic lightweight heartbeat while tab is visible (keeps side-by-side windows in sync)
        setInterval(() => {
            if (document.visibilityState === "visible" && getCurrentUser()) {
                triggerAutoCloudRefresh();
            }
        }, 25000);
    }
}
