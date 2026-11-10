/**
 * ElementSpeller - Dual-Layer Storage Module
 * Offline-first localStorage with real-time Firestore cloud synchronization.
 * Supports timer-based solves, streaks, replay/reset, and calendar history.
 */
import { onAuthChange, getCurrentUser } from "./auth.js";
import { getFirebaseServices } from "./firebase-config.js";

let firestoreDb = null;
let firestoreFns = null;

async function loadFirestore() {
    if (firestoreFns && firestoreDb) return { db: firestoreDb, fns: firestoreFns };
    try {
        const services = await getFirebaseServices();
        if (!services || !services.isAvailable || !services.db) return null;
        const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        firestoreDb = services.db;
        firestoreFns = {
            doc: firestoreModule.doc,
            getDoc: firestoreModule.getDoc,
            setDoc: firestoreModule.setDoc,
            onSnapshot: firestoreModule.onSnapshot
        };
        return { db: firestoreDb, fns: firestoreFns };
    } catch (e) {
        console.warn("Firestore unavailable offline:", e);
        return null;
    }
}

const STATS_KEY = "elementspeller_stats_v1";
const HISTORY_KEY = "elementspeller_history_v1";
const PRACTICE_HISTORY_KEY = "elementspeller_practice_history_v1";
const ACTIVE_KEY = "elementspeller_active_state_v1";

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

let memoryHistory = loadLocalHistory();
let memoryPracticeHistory = loadLocalPracticeHistory();
let memoryStats = sanitizeStats(loadLocalStats(), memoryHistory, memoryPracticeHistory);

try {
    localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
} catch (e) { }

let firestoreUnsubscribe = null;
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

export function loadLocalPracticeHistory() {
    try {
        let raw = localStorage.getItem(PRACTICE_HISTORY_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error("Failed to parse local practice history:", e);
    }
    return [];
}

export function getPracticeHistory() {
    return [...memoryPracticeHistory];
}
            console.error("Error in storage listener:", e);
        }
    });
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
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error("Failed to parse local history:", e);
    }
    return {};
}

function computeStreaksFromHistory(history) {
    const dates = Object.keys(history || {}).sort();
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

    const todayStr = new Date().toISOString().slice(0, 10);
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
    const allWonGames = [];

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

    // Process daily entries
    for (const r of dailyEntries) {
        if (r.won) {
            won++;
            allWonGames.push(r);
            if (r.hintsUsed) totalHints += r.hintsUsed;
            if (r.solveTimeMs && r.solveTimeMs > 0) {
                totalTime += r.solveTimeMs;
                bestTime = (bestTime === null) ? r.solveTimeMs : Math.min(bestTime, r.solveTimeMs);
                const bin = getTimeBin(r.solveTimeMs);
                dist[bin] = (dist[bin] || 0) + 1;
            }
        }
    }

    // Process practice entries
    let practiceWon = 0;
    for (const pr of practiceEntries) {
        if (pr.won) {
            practiceWon++;
            won++;
            allWonGames.push(pr);
            if (pr.hintsUsed) totalHints += pr.hintsUsed;
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
    clean.maxStreak = Math.max(clean.maxStreak, maxStreak);

    return clean;
}

export function saveLocalStats(stats) {
    memoryStats = sanitizeStats(stats, memoryHistory, memoryPracticeHistory);
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
    } catch (e) {
        console.error("Failed to save local stats:", e);
    }
    syncToCloud();
    notifyListeners();
}

const DAILY_PROGRESS_PREFIX = "elementspeller_progress_v2_";

let progressSyncTimer = null;

async function syncProgressToCloud(dateStr, progress) {
    const user = getCurrentUser();
    if (!user || !dateStr) return;
    clearTimeout(progressSyncTimer);
    progressSyncTimer = setTimeout(async () => {
        const services = await loadFirestore();
        if (!services || !services.db || !services.fns) return;
        try {
            const userRef = services.fns.doc(services.db, "users", user.uid);
            await services.fns.setDoc(userRef, {
                [`elementspeller_progress_${dateStr}`]: progress,
                lastUpdated: Date.now()
            }, { merge: true });
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
    } catch (e) { }
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
    } catch (e) { }
    return null;
}

export function clearDailyProgress(dateStr) {
    if (!dateStr) return;
    try {
        localStorage.removeItem(`${DAILY_PROGRESS_PREFIX}${dateStr}`);
    } catch (e) { }
    const user = getCurrentUser();
    if (user) {
        loadFirestore().then(services => {
            if (services && services.db && services.fns) {
                const userRef = services.fns.doc(services.db, "users", user.uid);
                services.fns.setDoc(userRef, {
                    [`elementspeller_progress_${dateStr}`]: null
                }, { merge: true }).catch(() => {});
            }
        });
    }
}

export function recordCompletion(dateStr, puzzleNum, wordOrWords, won, elementsUsedOrWordRecords, solveTimeMs, hintsUsed = 0) {
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

    const record = {
        dateStr,
        puzzleNum,
        word: primaryWord,
        words: words,
        won: true,
        solveTimeMs: finalSolveTime,
        hintsUsed: (hintsUsed !== undefined && hintsUsed !== null) ? hintsUsed : (existing?.hintsUsed || 0),
        wordRecords: isArrayWords ? elementsUsedOrWordRecords : null,
        elementsUsed: isArrayWords ? (elementsUsedOrWordRecords?.[0]?.placedElements || []) : elementsUsedOrWordRecords,
        timestamp: Date.now()
    };

    memoryHistory[dateStr] = record;
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
    } catch (e) { }

    const stats = sanitizeStats(memoryStats, memoryHistory, memoryPracticeHistory);
    stats.lastPlayedDate = dateStr;
    saveLocalStats(stats);
    clearActiveState(dateStr);
    clearDailyProgress(dateStr);
    return record;
}

/**
 * Record a completed practice game so player can remember and review past practice games
 */
export function recordPracticeCompletion(words, won, elementsUsedOrWordRecords, solveTimeMs, hintsUsed = 0) {
    const isArrayWords = Array.isArray(words);
    const primaryWord = isArrayWords ? words[0] : words;
    const finalWords = isArrayWords ? words : [words];
    const practiceNum = memoryPracticeHistory.length + 1;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const record = {
        id: `practice_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        mode: "practice",
        puzzleNum: `Practice #${practiceNum}`,
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

    memoryPracticeHistory.unshift(record);
    if (memoryPracticeHistory.length > 500) {
        memoryPracticeHistory = memoryPracticeHistory.slice(0, 500);
    }

    try {
        localStorage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(memoryPracticeHistory));
    } catch (e) { }

    const stats = sanitizeStats(memoryStats, memoryHistory, memoryPracticeHistory);
    saveLocalStats(stats);
    syncToCloud();
    notifyListeners();
    return record;
}

/**
 * Get all completed game records (Daily + Practice) combined and sorted by timestamp descending
 */
export function getAllGameRecords() {
    const dailyRecords = Object.entries(memoryHistory).map(([dateStr, rec]) => ({
        ...rec,
        id: `daily_${dateStr}`,
        mode: "daily",
        dateStr: dateStr,
        puzzleNum: rec.puzzleNum || `#${getPuzzleNumber(dateStr)}`,
        displayNum: `#${rec.puzzleNum || getPuzzleNumber(dateStr)}`,
        timestamp: rec.timestamp || (new Date(dateStr + "T12:00:00Z").getTime())
    }));
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
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
    } catch (e) { }

    clearActiveState(dateStr);
    clearDailyProgress(dateStr);
    memoryStats = sanitizeStats(memoryStats, memoryHistory, memoryPracticeHistory);
    try {
        localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
    } catch (e) { }

    await syncToCloud();
    notifyListeners();
    return true;
}

export function saveActiveState(dateStr, state) {
    try {
        localStorage.setItem(ACTIVE_KEY, JSON.stringify({ dateStr, state, timestamp: Date.now() }));
    } catch (e) { }
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
    } catch (e) { }
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
    } catch (e) { }
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
 * Sync local state to Firestore
 */
async function syncToCloud() {
    const user = getCurrentUser();
    if (!user) return;
    const services = await loadFirestore();
    if (!services || !services.db || !services.fns) return;

    try {
        const userRef = services.fns.doc(services.db, "users", user.uid);
        const cleanStats = sanitizeStats(memoryStats, memoryHistory, memoryPracticeHistory);
        await services.fns.setDoc(userRef, {
            element_speller_stats: cleanStats,
            element_speller_history: memoryHistory,
            elementspeller_stats: cleanStats,
            elementspeller_history: memoryHistory,
            elementspeller_practice_history: memoryPracticeHistory,
            lastUpdated: Date.now()
        }, { merge: true });
    } catch (e) {
        console.warn("Could not sync ElementSpeller data to Firestore:", e);
    }
}

/**
 * Listen for auth change to load / merge cloud profile
 */
onAuthChange(async (user) => {
    if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
    }

    if (!user) return;
    const services = await loadFirestore();
    if (!services || !services.db || !services.fns) return;

    try {
        const userRef = services.fns.doc(services.db, "users", user.uid);
        const snap = await services.fns.getDoc(userRef);

        if (snap.exists()) {
            const cloudData = snap.data();
            const cloudStats = cloudData.element_speller_stats || cloudData.elementspeller_stats || cloudData.elementle_stats || {};
            const cloudHistory = cloudData.element_speller_history || cloudData.elementspeller_history || cloudData.elementle_history || {};

            // Merge active puzzle progress from cloud
            for (const [key, val] of Object.entries(cloudData)) {
                if (key.startsWith("elementspeller_progress_") && val) {
                    const dStr = key.replace("elementspeller_progress_", "");
                    const localRaw = localStorage.getItem(`${DAILY_PROGRESS_PREFIX}${dStr}`);
                    const localData = localRaw ? JSON.parse(localRaw) : null;
                    if (!localData || (val.timestamp && val.timestamp > (localData.timestamp || 0))) {
                        try {
                            localStorage.setItem(`${DAILY_PROGRESS_PREFIX}${dStr}`, JSON.stringify({
                                dateStr: dStr,
                                progress: val,
                                timestamp: val.timestamp || Date.now()
                            }));
                        } catch (e) { }
                    }
                }
            }

            // Merge daily history: union of completed puzzles
            const mergedHistory = { ...memoryHistory };
            for (const [date, rec] of Object.entries(cloudHistory)) {
                if (!mergedHistory[date]) {
                    mergedHistory[date] = rec;
                } else if (rec.won) {
                    if (!mergedHistory[date].won || (rec.solveTimeMs && (!mergedHistory[date].solveTimeMs || rec.solveTimeMs < mergedHistory[date].solveTimeMs))) {
                        mergedHistory[date] = rec;
                    }
                }
            }

            // Merge practice history from cloud
            if (cloudData.elementspeller_practice_history && Array.isArray(cloudData.elementspeller_practice_history)) {
                const existingIds = new Set(memoryPracticeHistory.map(p => p.id));
                for (const pr of cloudData.elementspeller_practice_history) {
                    if (!existingIds.has(pr.id)) {
                        memoryPracticeHistory.push(pr);
                        existingIds.add(pr.id);
                    }
                }
                memoryPracticeHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                try {
                    localStorage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(memoryPracticeHistory));
                } catch (e) { }
            }

            memoryHistory = mergedHistory;
            memoryStats = sanitizeStats(cloudStats, memoryHistory, memoryPracticeHistory);

            localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
            localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
            notifyListeners();

            // Push clean merged data back to cloud
            await syncToCloud();
        } else {
            // First time login for this user: seed cloud with current local stats
            await syncToCloud();
        }

        // Setup real-time listener for multi-tab or cross-device updates
        firestoreUnsubscribe = services.fns.onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const updated = docSnap.data();
                const incomingHist = updated.element_speller_history || updated.elementspeller_history || updated.elementle_history;
                const incomingPractice = updated.elementspeller_practice_history;
                const incomingStats = updated.element_speller_stats || updated.elementspeller_stats || updated.elementle_stats;
                if (incomingHist) memoryHistory = { ...memoryHistory, ...incomingHist };
                if (incomingPractice && Array.isArray(incomingPractice)) {
                    const existingIds = new Set(memoryPracticeHistory.map(p => p.id));
                    for (const pr of incomingPractice) {
                        if (!existingIds.has(pr.id)) {
                            memoryPracticeHistory.push(pr);
                            existingIds.add(pr.id);
                        }
                    }
                    memoryPracticeHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    try {
                        localStorage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(memoryPracticeHistory));
                    } catch (e) { }
                }
                if (incomingStats) {
                    memoryStats = sanitizeStats({ ...DEFAULT_STATS, ...incomingStats }, memoryHistory, memoryPracticeHistory);
                } else {
                    memoryStats = sanitizeStats(memoryStats, memoryHistory, memoryPracticeHistory);
                }
                localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
                localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
                notifyListeners();
            }
        });
    } catch (e) {
        console.warn("Error setting up Firestore storage sync:", e);
    }
});
