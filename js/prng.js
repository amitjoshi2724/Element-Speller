/**
 * Deterministic PRNG & Date Arithmetic Module for ElementSpeller — Daily Word Puzzle
 * Uses Mulberry32 algorithm seeded by date hash.
 */
import { WORDS } from './words.js';

// Epoch for Puzzle #1: Jan 1, 2025
export const EPOCH_DATE_STR = '2025-01-01';

export function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function createMulberry32(seed) {
    let s = seed >>> 0;
    return function() {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function parseDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function getTodayDateStr() {
    return formatDate(new Date());
}

export function getPuzzleNumber(dateStr, epochStr = EPOCH_DATE_STR) {
    const [y1, m1, d1] = dateStr.split('-').map(Number);
    const [y2, m2, d2] = epochStr.split('-').map(Number);
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    return Math.max(1, Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24)) + 1);
}

export function getDateForPuzzleNumber(puzzleNum, epochStr = EPOCH_DATE_STR) {
    const [y2, m2, d2] = epochStr.split('-').map(Number);
    const d = new Date(Date.UTC(y2, m2 - 1, d2 + (puzzleNum - 1)));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Deterministically pick 6 daily words using Mulberry32.
 * Picks distinct, engaging words (4-8 letters preferred) deterministically seeded by date.
 */
export function getDailyWords(dateStr, count = 6) {
    const seedVal = hashString(`elementspeller-words-v2-${dateStr}`);
    const rng = createMulberry32(seedVal);
    const words = [];
    const used = new Set();

    // Prefer fun, readable word lengths (4-8 chars) so they fit nicely on screen
    const preferred = WORDS.filter(w => w.length >= 4 && w.length <= 8);
    let attempts = 0;
    while (words.length < count && attempts < 5000) {
        attempts++;
        const idx = Math.floor(rng() * preferred.length);
        const w = preferred[idx];
        if (!used.has(w)) {
            used.add(w);
            words.push(w);
        }
    }

    // Fallback if needed
    while (words.length < count) {
        const idx = Math.floor(rng() * WORDS.length);
        const w = WORDS[idx];
        if (!used.has(w)) {
            used.add(w);
            words.push(w);
        }
    }

    return {
        words,
        puzzleNumber: getPuzzleNumber(dateStr),
        dateStr
    };
}

/**
 * Deterministically pick daily word (backward compatible with single word callers).
 */
export function getDailyWord(dateStr) {
    const res = getDailyWords(dateStr, 6);
    return {
        word: res.words[0],
        words: res.words,
        puzzleNumber: res.puzzleNumber,
        dateStr
    };
}

/**
 * Pick random words for Practice mode (defaults to 6 words).
 */
export function getRandomWords(count = 6) {
    const preferred = WORDS.filter(w => w.length >= 4 && w.length <= 8);
    const words = [];
    const used = new Set();
    while (words.length < count) {
        const idx = Math.floor(Math.random() * preferred.length);
        const w = preferred[idx];
        if (!used.has(w)) {
            used.add(w);
            words.push(w);
        }
    }
    return {
        words,
        isPractice: true
    };
}

/**
 * Pick a random word for Practice mode (backward compatible with single word callers).
 */
export function getRandomWord() {
    const res = getRandomWords(6);
    return {
        word: res.words[0],
        words: res.words,
        isPractice: true
    };
}
