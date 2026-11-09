import { elementData, symbols, nameToData, symbolToData, parseElementInput } from "./elements.js";
import { getDailyWords, getRandomWords, getTodayDateStr, getPuzzleNumber, getDateForPuzzleNumber, EPOCH_DATE_STR, parseDate } from "./prng.js";
import {
    getStats,
    getHistory,
    getRecordForDate,
    recordCompletion,
    saveDailyProgress,
    loadDailyProgress,
    clearDailyProgress,
    onStorageChange,
    resetDailyGameResult,
    formatTimeMs,
    getTimeBin
} from "./storage.js";
import { PeriodicTable } from "./periodic-table.js";
import { setupAuthUI } from "./auth.js";

class ElementSpellerGame {
    constructor() {
        this.todayStr = getTodayDateStr();
        this.currentDateStr = this.todayStr;
        this.isPractice = false;

        // 6-Word Daily Set State
        this.dailyWords = [];
        this.currentWordIdx = 0;
        this.wordStates = []; // [{ word, placedElements: [], isSolved: false, solveTimeMs: null }]

        this.puzzleNumber = 1;
        this.isGameOver = false;
        this.isWordRevealed = false;
        this.draggedElementIndex = null;

        // Timer
        this.startTime = null;
        this.elapsedOffsetMs = 0;
        this.solveTimeMs = null;
        this.timerInterval = null;

        // Calendar Archive state
        const todayDate = parseDate(this.todayStr);
        this.calYear = todayDate.getFullYear();
        this.calMonth = todayDate.getMonth();

        this.initDOM();
        this.initDatalist();
        this.initPeriodicTable();
        this.initEventListeners();
        this.setupArchiveTabs();
        setupAuthUI("auth-container");

        this.checkURLParamsAndStorage();
        if (this.isPractice) {
            this.startPuzzle(null, true);
        } else {
            this.startPuzzle(this.currentDateStr || this.todayStr, false);
        }
        this.startMidnightCountdown();

        window.addEventListener("popstate", () => {
            this.checkURLParamsAndStorage();
            if (this.isPractice) {
                this.startPuzzle(null, true);
            } else {
                this.startPuzzle(this.currentDateStr || this.todayStr, false);
            }
        });

        // Ensure Ko-fi widget renders cleanly at bottom
        setTimeout(() => {
            const kofiContainer = document.getElementById("kofi-widget-container");
            if (kofiContainer && !kofiContainer.querySelector(".btn-container") && !kofiContainer.querySelector(".kofi-button")) {
                if (window.kofiwidget2) {
                    try {
                        window.kofiwidget2.init("Support me on Ko-fi", "#72a4f2", "I2I81CDN0L");
                        kofiContainer.innerHTML = window.kofiwidget2.getHTML();
                    } catch (e) {
                        console.error("Ko-fi widget fallback error:", e);
                    }
                }
            }
        }, 300);

        onStorageChange(() => {
            if (this.dom.statsModal && this.dom.statsModal.classList.contains("active")) {
                this.renderStatsModal();
            }
            if (this.dom.archiveModal && this.dom.archiveModal.classList.contains("active")) {
                this.renderCalendarView();
                this.renderArchiveList();
            }
        });
    }

    get currentWord() {
        return this.dailyWords[this.currentWordIdx] || "";
    }

    get placedElements() {
        if (!this.wordStates[this.currentWordIdx]) return [];
        return this.wordStates[this.currentWordIdx].placedElements;
    }

    set placedElements(val) {
        if (!this.wordStates[this.currentWordIdx]) return;
        this.wordStates[this.currentWordIdx].placedElements = val;
    }

    initDOM() {
        this.dom = {
            puzzleTitle: document.getElementById("puzzle-meta-badge"),
            modeDailyBtn: document.getElementById("mode-daily-btn"),
            modePracticeBtn: document.getElementById("mode-practice-btn"),
            targetWordDisplay: document.getElementById("target-word-display"),
            elementSlotsRow: document.getElementById("element-slots-row"),
            elementInput: document.getElementById("element-input"),
            submitBtn: document.getElementById("submit-element-btn"),
            statusMessage: document.getElementById("status-message"),
            elementDetails: document.getElementById("pt-inspect-card") || document.getElementById("element-details"),
            modeTitle: document.getElementById("mode-title-text"),
            liveTimerDisplay: document.getElementById("live-timer-display"),
            stopwatchBadge: document.getElementById("stopwatch-badge"),
            undoBtn: document.getElementById("undo-element-btn"),
            clearWordBtn: document.getElementById("clear-word-btn"),
            resetBtn: document.getElementById("reset-puzzle-btn"),
            inputGroupArea: document.getElementById("input-group-area"),
            trashCanZone: document.getElementById("trash-can-zone"),
            trashCanLabel: document.getElementById("trash-can-label"),
            dragHintText: document.getElementById("drag-hint-text"),

            // Word picker elements
            wordPickerBar: document.getElementById("word-picker-bar"),
            wordPickerLabel: document.getElementById("word-picker-label"),
            currentWordNum: document.getElementById("current-word-num"),
            wordsSolvedCounter: document.getElementById("words-solved-counter"),
            wordPillsRow: document.getElementById("word-pills-row"),
            nextWordQuickBtn: document.getElementById("next-word-quick-btn"),

            // Solved card
            solvedCard: document.getElementById("solved-card"),
            solvedTimeStat: document.getElementById("solved-time-stat"),
            solvedWordsBreakdown: document.getElementById("solved-words-breakdown"),
            shareScoreNoSpoilerBtn: document.getElementById("share-score-no-spoiler-btn"),
            shareScoreSpoilerBtn: document.getElementById("share-score-spoiler-btn"),
            shareScoreQuickBtn: document.getElementById("share-score-quick-btn"),
            solvedReplayBtn: document.getElementById("solved-replay-btn"),

            // Modals
            howToPlayModal: document.getElementById("how-to-play-modal"),
            statsModal: document.getElementById("stats-modal"),
            archiveModal: document.getElementById("archive-modal"),

            // Periodic table section on main screen
            periodicTableSection: document.getElementById("periodic-table-section"),
            openTableBtn: document.getElementById("open-table-btn"),
            ptToggleBtn: document.getElementById("pt-toggle-btn"),
            ptContentBody: document.getElementById("pt-content-body"),
            ptToggleIcon: document.getElementById("pt-toggle-icon"),
            ptToggleLabel: document.getElementById("pt-toggle-label"),

            // Stats elements
            statPlayed: document.getElementById("stat-played"),
            statWinPct: document.getElementById("stat-win-pct"),
            statStreak: document.getElementById("stat-streak"),
            statMaxStreak: document.getElementById("stat-max-streak"),
            statBestTime: document.getElementById("stat-best-time"),
            statAvgTime: document.getElementById("stat-avg-time"),
            statsPuzzleTitle: document.getElementById("stats-puzzle-summary-title"),
            statsPuzzleTime: document.getElementById("stats-puzzle-summary-time"),
            statsPuzzleStatus: document.getElementById("stats-puzzle-summary-status"),
            nextCountdown: document.getElementById("next-countdown-val"),
            statsShareNoSpoilerBtn: document.getElementById("stats-share-no-spoiler-btn"),
            statsShareSpoilerBtn: document.getElementById("stats-share-spoiler-btn"),
            shareBtn: document.getElementById("share-btn"),
            statsRetryBtn: document.getElementById("stats-retry-btn"),

            // Archive elements
            archiveTabCal: document.getElementById("archive-tab-calendar"),
            archiveTabList: document.getElementById("archive-tab-list"),
            calView: document.getElementById("archive-calendar-view"),
            listView: document.getElementById("archive-list-view"),
            calPrevBtn: document.getElementById("cal-prev-month-btn"),
            calNextBtn: document.getElementById("cal-next-month-btn"),
            calTodayBtn: document.getElementById("cal-today-btn"),
            calMonthSelect: document.getElementById("cal-month-select"),
            calYearSelect: document.getElementById("cal-year-select"),
            calDaysContainer: document.getElementById("calendar-days-container"),
            archiveSearchInput: document.getElementById("archive-search"),
            archiveListContainer: document.getElementById("archive-list-container")
        };

        // Ensure spellcheck and autocorrect are firmly disabled on element input
        if (this.dom.elementInput) {
            this.dom.elementInput.setAttribute("spellcheck", "false");
            this.dom.elementInput.setAttribute("autocorrect", "off");
            this.dom.elementInput.setAttribute("autocapitalize", "none");
        }
    }

    /**
     * Populate datalist without duplicates.
     * Each element appears exactly once in the format: "[Symbol] - Name"
     */
    initDatalist() {
        const datalist = document.getElementById("elements-datalist");
        if (!datalist) return;
        datalist.innerHTML = "";

        // Exactly 118 options, one per element, no duplicates
        for (const sym of symbols) {
            const data = elementData[sym];
            if (!data) continue;
            const opt = document.createElement("option");
            opt.value = `${sym} - ${data.name}`;
            datalist.appendChild(opt);
        }
    }

    initPeriodicTable() {
        this.periodicTable = new PeriodicTable({
            onSelectElement: (elem) => this.handlePeriodicTableSelect(elem)
        });
    }

    handlePeriodicTableSelect(elem) {
        if (this.isGameOver) return;

        // Auto-start timer on first element placement if not already running
        if (!this.timerInterval) {
            this.startSolveTimer(this.elapsedOffsetMs || 0);
        }

        // Place or guess this element in current active word
        const currentWordState = this.wordStates[this.currentWordIdx];
        if (!currentWordState || currentWordState.isSolved) {
            this.goToNextUnsolvedWord();
        }
        this.handleGuess(elem.symbol);
    }

    initEventListeners() {
        // Submit on button click
        if (this.dom.submitBtn) {
            this.dom.submitBtn.addEventListener("click", () => this.handleGuess());
        }

        // Submit on Enter key in input
        if (this.dom.elementInput) {
            this.dom.elementInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    this.handleGuess();
                }
            });
        }

        // Undo & Reset & Clear Word buttons
        if (this.dom.undoBtn) {
            this.dom.undoBtn.addEventListener("click", () => this.handleUndo());
        }
        if (this.dom.clearWordBtn) {
            this.dom.clearWordBtn.addEventListener("click", () => this.handleClearWord());
        }
        if (this.dom.resetBtn) {
            this.dom.resetBtn.addEventListener("click", () => this.handleReset(true));
        }
        if (this.dom.solvedReplayBtn) {
            this.dom.solvedReplayBtn.addEventListener("click", () => this.handleReset(false));
        }
        if (this.dom.statsRetryBtn) {
            this.dom.statsRetryBtn.addEventListener("click", () => {
                this.closeModal(this.dom.statsModal);
                this.handleReset(true);
            });
        }

        // Next word button
        if (this.dom.nextWordQuickBtn) {
            this.dom.nextWordQuickBtn.addEventListener("click", () => this.goToNextUnsolvedWord());
        }

        // Share buttons (No Spoilers vs With Spoilers)
        if (this.dom.shareScoreNoSpoilerBtn) {
            this.dom.shareScoreNoSpoilerBtn.addEventListener("click", () => {
                this.copyShareCard(false, this.dom.shareScoreNoSpoilerBtn);
            });
        }
        if (this.dom.shareScoreSpoilerBtn) {
            this.dom.shareScoreSpoilerBtn.addEventListener("click", () => {
                this.copyShareCard(true, this.dom.shareScoreSpoilerBtn);
            });
        }
        if (this.dom.statsShareNoSpoilerBtn) {
            this.dom.statsShareNoSpoilerBtn.addEventListener("click", () => {
                this.copyShareCard(false, this.dom.statsShareNoSpoilerBtn);
            });
        }
        if (this.dom.statsShareSpoilerBtn) {
            this.dom.statsShareSpoilerBtn.addEventListener("click", () => {
                this.copyShareCard(true, this.dom.statsShareSpoilerBtn);
            });
        }
        if (this.dom.shareBtn) {
            this.dom.shareBtn.addEventListener("click", () => {
                this.copyShareCard(false, this.dom.shareBtn);
            });
        }
        if (this.dom.shareScoreQuickBtn) {
            this.dom.shareScoreQuickBtn.addEventListener("click", () => {
                this.copyShareCard(false, this.dom.shareScoreQuickBtn);
            });
        }

        // Trash Can Drag & Drop and Click Handlers
        if (this.dom.trashCanZone) {
            this.dom.trashCanZone.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                this.dom.trashCanZone.classList.add("drag-over");
                if (this.dom.trashCanLabel) this.dom.trashCanLabel.textContent = "Release to delete!";
            });

            this.dom.trashCanZone.addEventListener("dragleave", () => {
                this.dom.trashCanZone.classList.remove("drag-over");
                if (this.dom.trashCanLabel) this.dom.trashCanLabel.textContent = "Drop element here to delete";
            });

            this.dom.trashCanZone.addEventListener("drop", (e) => {
                e.preventDefault();
                this.dom.trashCanZone.classList.remove("drag-over", "drag-active");
                if (this.dom.trashCanLabel) this.dom.trashCanLabel.textContent = "Drag element here to delete";

                const rawIdx = e.dataTransfer.getData("text/plain");
                const idx = rawIdx !== "" ? parseInt(rawIdx, 10) : this.draggedElementIndex;
                if (!isNaN(idx) && idx >= 0 && idx < this.placedElements.length) {
                    this.deleteElementAtIndex(idx);
                }
            });

            // Clicking trash can removes the last element (intuitive quick-delete)
            this.dom.trashCanZone.addEventListener("click", () => {
                if (this.placedElements.length > 0 && !this.isGameOver && this.isWordRevealed) {
                    this.deleteElementAtIndex(this.placedElements.length - 1);
                }
            });
        }

        // Segmented Daily vs Practice Toggle
        if (this.dom.modeDailyBtn) {
            this.dom.modeDailyBtn.addEventListener("click", () => this.setGameMode(false));
        }
        if (this.dom.modePracticeBtn) {
            this.dom.modePracticeBtn.addEventListener("click", () => this.setGameMode(true));
        }

        // Modals Open Buttons
        const openHelpBtn = document.getElementById("open-help-btn");
        if (openHelpBtn) {
            openHelpBtn.addEventListener("click", () => this.openModal(this.dom.howToPlayModal));
        }

        const openStatsBtn = document.getElementById("open-stats-btn");
        if (openStatsBtn) {
            openStatsBtn.addEventListener("click", () => {
                this.renderStatsModal();
                this.openModal(this.dom.statsModal);
            });
        }

        const openArchiveBtn = document.getElementById("open-archive-btn");
        if (openArchiveBtn) {
            openArchiveBtn.addEventListener("click", () => {
                this.renderCalendarView();
                this.renderArchiveList();
                this.openModal(this.dom.archiveModal);
            });
        }

        if (this.dom.openTableBtn) {
            this.dom.openTableBtn.addEventListener("click", () => {
                if (this.dom.periodicTableSection) {
                    this.dom.periodicTableSection.scrollIntoView({ behavior: "smooth" });
                }
            });
        }

        // Periodic table collapse / expand toggle
        if (this.dom.ptToggleBtn && this.dom.ptContentBody) {
            this.dom.ptToggleBtn.addEventListener("click", () => {
                const isCurrentlyHidden = this.dom.ptContentBody.style.display === "none";
                this.dom.ptContentBody.style.display = isCurrentlyHidden ? "block" : "none";
                this.dom.ptToggleBtn.setAttribute("aria-expanded", isCurrentlyHidden ? "true" : "false");
                if (this.dom.ptToggleIcon) this.dom.ptToggleIcon.textContent = isCurrentlyHidden ? "▾" : "▴";
                if (this.dom.ptToggleLabel) this.dom.ptToggleLabel.textContent = isCurrentlyHidden ? "Hide Table" : "Show Table";
            });
        }

        // Modals Close handlers
        document.querySelectorAll(".modal-close-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const overlay = e.target.closest(".modal-overlay");
                if (overlay) this.closeModal(overlay);
            });
        });

        document.querySelectorAll(".modal-overlay").forEach(overlay => {
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) this.closeModal(overlay);
            });
        });

        // Close modal on Escape
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                document.querySelectorAll(".modal-overlay.active").forEach(m => this.closeModal(m));
            }
        });
    }

    checkURLParamsAndStorage() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const dateParam = urlParams.get("date");
            const modeParam = urlParams.get("mode");

            if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
                this.currentDateStr = dateParam;
                this.isPractice = false;
            } else if (modeParam === "practice" || modeParam === "unlimited") {
                this.isPractice = true;
            } else if (modeParam === "daily") {
                this.isPractice = false;
            } else {
                const savedMode = localStorage.getItem("elementspeller_game_mode");
                this.isPractice = (savedMode === "practice" || savedMode === "unlimited");
            }
        } catch (e) {
            console.warn("Storage/URL mode detection error:", e);
            this.isPractice = false;
        }
        this.updateModeUI(false);
    }

    setGameMode(isPractice) {
        if (this.isPractice === isPractice) {
            if (isPractice) {
                this.startPuzzle(null, true);
            }
            return;
        }
        this.isPractice = isPractice;
        this.updateModeUI(true);
        if (this.isPractice) {
            this.startPuzzle(null, true);
        } else {
            this.startPuzzle(this.todayStr, false);
        }
    }

    updateModeUI(updateURL = true) {
        const modeDailyBtn = this.dom?.modeDailyBtn || document.getElementById("mode-daily-btn");
        const modePracticeBtn = this.dom?.modePracticeBtn || document.getElementById("mode-practice-btn");

        if (modeDailyBtn && modePracticeBtn) {
            if (this.isPractice) {
                modeDailyBtn.classList.remove("active");
                modePracticeBtn.classList.add("active");
            } else {
                modeDailyBtn.classList.add("active");
                modePracticeBtn.classList.remove("active");
            }
        }

        try {
            localStorage.setItem("elementspeller_game_mode", this.isPractice ? "practice" : "daily");
        } catch (e) { }

        if (updateURL && window.history && window.history.replaceState) {
            try {
                const url = new URL(window.location.href);
                if (this.isPractice) {
                    url.searchParams.set("mode", "practice");
                    url.searchParams.delete("date");
                } else {
                    url.searchParams.delete("mode");
                    if (this.currentDateStr && this.currentDateStr !== this.todayStr) {
                        url.searchParams.set("date", this.currentDateStr);
                    } else {
                        url.searchParams.delete("date");
                    }
                }
                const newSearch = url.searchParams.toString();
                const newPath = url.pathname + (newSearch ? `?${newSearch}` : "");
                window.history.replaceState(null, "", newPath);
            } catch (e) {
                console.warn("Error updating URL history state:", e);
            }
        }
    }

    startPuzzle(dateStr, isPractice = false) {
        this.isPractice = isPractice;
        this.isGameOver = false;
        this.currentWordIdx = 0;
        this.solveTimeMs = null;
        this.elapsedOffsetMs = 0;
        this.stopSolveTimer();

        if (this.dom.undoBtn) this.dom.undoBtn.disabled = true;
        if (this.dom.clearWordBtn) this.dom.clearWordBtn.disabled = true;
        if (this.dom.solvedCard) this.dom.solvedCard.style.display = "none";
        if (this.dom.inputGroupArea) this.dom.inputGroupArea.style.display = "block";
        if (this.dom.nextWordQuickBtn) this.dom.nextWordQuickBtn.style.display = "none";

        let puzzleInfo;
        if (isPractice) {
            puzzleInfo = getRandomWords(6);
            this.currentDateStr = null;
            this.dailyWords = puzzleInfo.words;
            this.puzzleNumber = "Practice";
            this.dom.puzzleTitle.textContent = "🧪 Practice Mode • 6 Random Words";
            this.dom.modeTitle.textContent = "Element-Speller (Practice)";
        } else {
            this.currentDateStr = dateStr;
            const existingRecord = getRecordForDate(dateStr);
            const isLegacySingleWord = existingRecord && existingRecord.won &&
                (!existingRecord.wordRecords || !Array.isArray(existingRecord.wordRecords) || existingRecord.wordRecords.length <= 1);

            if (isLegacySingleWord) {
                // Legacy 1-word puzzle completed in the past
                this.dailyWords = [existingRecord.word];
                this.puzzleNumber = existingRecord.puzzleNum || getPuzzleNumber(dateStr);
                this.dom.puzzleTitle.textContent = `📅 Past Puzzle #${this.puzzleNumber} • ${dateStr} • 1 Word (Classic)`;
                this.dom.modeTitle.textContent = `Element-Speller #${this.puzzleNumber}`;

                const userTiles = (existingRecord.elementsUsed || []).map(e => {
                    const canonical = symbolToData[e.symbol?.toLowerCase()];
                    return canonical ? { ...canonical } : { symbol: e.symbol, name: e.name || e.symbol, number: e.number || "" };
                });

                this.wordStates = [{
                    word: existingRecord.word,
                    placedElements: userTiles,
                    isSolved: true,
                    solveTimeMs: existingRecord.solveTimeMs || null
                }];

                this.isWordRevealed = true;
                this.isGameOver = true;
                this.solveTimeMs = existingRecord.solveTimeMs || 0;

                this.updateModeUI(true);
                this.renderWordPicker();
                this.renderTargetWord();
                this.renderElementSlots();
                this.renderSolvedCardBreakdown();

                this.dom.liveTimerDisplay.textContent = this.formatElapsed(this.solveTimeMs);
                this.dom.statusMessage.textContent = `⭐ Solved on this date in ${formatTimeMs(this.solveTimeMs)}! Classic single-word puzzle complete.`;
                this.dom.statusMessage.className = "success";

                if (this.dom.solvedCard) {
                    this.dom.solvedCard.style.display = "block";
                    this.dom.solvedTimeStat.textContent = `Solved in ${formatTimeMs(this.solveTimeMs)}`;
                }
                if (this.dom.inputGroupArea) this.dom.inputGroupArea.style.display = "none";
                return;
            }

            // Normal 6-word daily puzzle
            puzzleInfo = getDailyWords(dateStr, 6);
            this.dailyWords = (existingRecord && existingRecord.words && existingRecord.words.length === 6)
                ? existingRecord.words
                : puzzleInfo.words;
            this.puzzleNumber = puzzleInfo.puzzleNumber;

            const isToday = dateStr === this.todayStr;
            this.dom.puzzleTitle.textContent = isToday
                ? `📅 Daily Puzzle #${this.puzzleNumber} • ${dateStr} • 6 Words`
                : `📅 Past Puzzle #${this.puzzleNumber} • ${dateStr} • 6 Words`;
            this.dom.modeTitle.textContent = `Element-Speller #${this.puzzleNumber}`;

            if (existingRecord && existingRecord.won && existingRecord.wordRecords && existingRecord.wordRecords.length > 1) {
                // Completed 6-word puzzle: load the user's exact placed elements
                this.isWordRevealed = true;
                this.isGameOver = true;
                this.solveTimeMs = existingRecord.solveTimeMs || 0;

                this.wordStates = existingRecord.wordRecords.map(rec => ({
                    word: rec.word,
                    placedElements: (rec.placedElements || []).map(e => {
                        const canonical = symbolToData[e.symbol?.toLowerCase()];
                        return canonical ? { ...canonical } : { symbol: e.symbol, name: e.name || e.symbol, number: e.number || "" };
                    }),
                    isSolved: true,
                    solveTimeMs: rec.solveTimeMs || null
                }));

                this.updateModeUI(true);
                this.renderWordPicker();
                this.renderTargetWord();
                this.renderElementSlots();
                this.renderSolvedCardBreakdown();

                this.dom.liveTimerDisplay.textContent = this.formatElapsed(this.solveTimeMs);
                this.dom.statusMessage.textContent = `⭐ Solved on this date in ${formatTimeMs(this.solveTimeMs)}! All 6 words complete.`;
                this.dom.statusMessage.className = "success";

                if (this.dom.solvedCard) {
                    this.dom.solvedCard.style.display = "block";
                    this.dom.solvedTimeStat.textContent = `Best Time: ${formatTimeMs(this.solveTimeMs)}`;
                }
                if (this.dom.inputGroupArea) this.dom.inputGroupArea.style.display = "none";
                return;
            }
        }

        // Initialize word states for the puzzle words
        this.wordStates = this.dailyWords.map(word => ({
            word,
            placedElements: [],
            isSolved: false,
            solveTimeMs: null
        }));

        this.updateModeUI(true);

        // Check for partial saved progress on today's puzzle
        const savedProgress = !isPractice ? loadDailyProgress(dateStr) : null;
        if (savedProgress && savedProgress.wordStates && Array.isArray(savedProgress.wordStates)) {
            // Restore matched words
            for (let i = 0; i < this.dailyWords.length; i++) {
                const word = this.dailyWords[i];
                const saved = savedProgress.wordStates.find(ws => ws.word === word) || savedProgress.wordStates[i];
                if (saved && (saved.word === word || !saved.word)) {
                    this.wordStates[i] = {
                        word,
                        placedElements: (saved.placedElements || []).map(e => {
                            const canonical = symbolToData[e.symbol?.toLowerCase()];
                            return canonical ? { ...canonical } : { symbol: e.symbol, name: e.name || e.symbol, number: e.number || "" };
                        }),
                        isSolved: !!saved.isSolved,
                        solveTimeMs: saved.solveTimeMs || null
                    };
                }
            }

            let targetIdx = 0;
            if (savedProgress.currentWordIdx !== undefined && !this.wordStates[savedProgress.currentWordIdx]?.isSolved) {
                targetIdx = savedProgress.currentWordIdx;
            } else {
                const firstUnsolved = this.wordStates.findIndex(s => !s.isSolved);
                targetIdx = firstUnsolved !== -1 ? firstUnsolved : 0;
            }
            this.currentWordIdx = targetIdx;
            this.elapsedOffsetMs = savedProgress.elapsedTimeMs || 0;
            this.isWordRevealed = true;

            this.renderWordPicker();
            this.renderTargetWord();
            this.renderElementSlots();

            if (this.dom.elementInput) {
                this.dom.elementInput.disabled = false;
                this.dom.elementInput.value = "";
                this.dom.elementInput.placeholder = "Enter element name or symbol (e.g. Carbon, C)...";
                this.dom.elementInput.focus();
            }
            if (this.dom.submitBtn) this.dom.submitBtn.disabled = false;

            const solvedCount = this.wordStates.filter(s => s.isSolved).length;
            if (this.elapsedOffsetMs > 0 || solvedCount > 0) {
                this.startSolveTimer(this.elapsedOffsetMs);
                this.dom.statusMessage.textContent = `Resumed puzzle! ${solvedCount}/${this.dailyWords.length} words solved (${this.formatElapsed(this.elapsedOffsetMs)} elapsed). Click any word to continue!`;
            } else {
                this.dom.liveTimerDisplay.textContent = "00:00.0";
                this.dom.statusMessage.textContent = `Spell all 6 words using chemical elements. Click any word to work on it! (Timer starts on first move)`;
            }
            this.dom.statusMessage.className = "info";
            return;
        }

        // Fresh unstarted state: words are revealed upfront, timer starts on first move
        this.isWordRevealed = true;
        this.stopSolveTimer();
        this.dom.liveTimerDisplay.textContent = "00:00.0";
        this.renderWordPicker();
        this.renderTargetWord();
        this.renderElementSlots();

        if (this.dom.elementInput) {
            this.dom.elementInput.value = "";
            this.dom.elementInput.disabled = false;
            this.dom.elementInput.placeholder = "Enter element name or symbol (e.g. Carbon, C)...";
            this.dom.elementInput.focus();
        }
        if (this.dom.submitBtn) {
            this.dom.submitBtn.disabled = false;
        }
        this.dom.statusMessage.textContent = "Spell all 6 words using chemical elements. Click any word to work on it! (Timer starts on first move)";
        this.dom.statusMessage.className = "info";
    }

    revealWordAndStart() {
        if (this.isGameOver) return;
        this.isWordRevealed = true;
        this.renderWordPicker();
        this.renderTargetWord();
        this.renderElementSlots();

        if (this.dom.elementInput) {
            this.dom.elementInput.disabled = false;
            this.dom.elementInput.placeholder = "Enter element name or symbol (e.g. Carbon, C)...";
            this.dom.elementInput.value = "";
            this.dom.elementInput.focus();
        }
        if (this.dom.submitBtn) {
            this.dom.submitBtn.disabled = false;
        }

        if (!this.timerInterval) {
            this.startSolveTimer(this.elapsedOffsetMs);
        }
        const count = this.dailyWords.length;
        this.dom.statusMessage.textContent = count > 1
            ? `Timer running! Spell Word ${this.currentWordIdx + 1} of ${count} ("${this.currentWord}").`
            : `Timer running! Spell "${this.currentWord}".`;
        this.dom.statusMessage.className = "info";
    }

    startSolveTimer(initialOffsetMs = 0) {
        this.stopSolveTimer();
        this.elapsedOffsetMs = initialOffsetMs;
        this.startTime = Date.now() - initialOffsetMs;
        this.tickSolveTimer();
        this.timerInterval = setInterval(() => this.tickSolveTimer(), 100);
    }

    stopSolveTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    tickSolveTimer() {
        if (!this.startTime) return;
        const elapsed = Date.now() - this.startTime;
        if (this.dom.liveTimerDisplay) {
            this.dom.liveTimerDisplay.textContent = this.formatElapsed(elapsed);
        }
    }

    formatElapsed(ms) {
        const totalSec = Math.max(0, ms / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = Math.floor(totalSec % 60);
        const tenths = Math.floor((totalSec * 10) % 10);
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
    }

    getMatchedPrefixLength() {
        const spelled = this.placedElements.map(e => e.symbol).join("").toUpperCase();
        const target = (this.currentWord || "").toUpperCase();
        let len = 0;
        while (len < target.length && len < spelled.length && target[len] === spelled[len]) {
            len++;
        }
        return len;
    }

    renderWordPicker() {
        if (!this.dom.wordPillsRow) return;
        this.dom.wordPillsRow.innerHTML = "";

        const solvedCount = this.wordStates.filter(s => s.isSolved).length;
        const totalWords = this.dailyWords.length;
        if (this.dom.wordsSolvedCounter) {
            this.dom.wordsSolvedCounter.textContent = `${solvedCount} / ${totalWords} Solved`;
        }
        if (this.dom.currentWordNum) {
            this.dom.currentWordNum.textContent = String(this.currentWordIdx + 1);
        }
        if (this.dom.wordPickerLabel) {
            this.dom.wordPickerLabel.innerHTML = `Word <strong id="current-word-num">${this.currentWordIdx + 1}</strong> of ${totalWords}`;
        }

        for (let i = 0; i < this.dailyWords.length; i++) {
            const state = this.wordStates[i];
            const word = this.dailyWords[i] || "";
            const isCurrent = (i === this.currentWordIdx);
            const isSolved = state ? state.isSolved : false;

            const pill = document.createElement("button");
            pill.type = "button";
            pill.className = `word-pill ${isCurrent ? "active" : ""} ${isSolved ? "solved" : ""}`;
            pill.dataset.index = String(i);
            pill.title = isSolved ? `Word #${i + 1}: ${word} (Solved)` : `Word #${i + 1}: ${word} (Click to solve)`;

            const badgeText = isSolved ? `✓ ${i + 1}` : `${i + 1}`;

            pill.innerHTML = `<span class="pill-badge">${badgeText}</span><span class="pill-word-name">${word}</span>`;

            pill.addEventListener("click", () => {
                this.selectWord(i);
            });

            this.dom.wordPillsRow.appendChild(pill);
        }
    }

    selectWord(index) {
        if (index < 0 || index >= this.dailyWords.length) return;
        this.currentWordIdx = index;

        this.renderWordPicker();
        this.renderTargetWord();
        this.renderElementSlots();
        this.updateButtonsState();

        const currentWordState = this.wordStates[this.currentWordIdx];
        if (!this.isGameOver) {
            if (currentWordState && currentWordState.isSolved) {
                this.dom.statusMessage.textContent = `Word ${index + 1} ("${this.currentWord}") is already solved! Pick another word or review.`;
                this.dom.statusMessage.className = "success";
                if (this.dom.elementInput) this.dom.elementInput.disabled = true;
                if (this.dom.submitBtn) this.dom.submitBtn.disabled = true;
            } else {
                this.dom.statusMessage.textContent = `Spelling Word ${index + 1} of ${this.dailyWords.length} ("${this.currentWord}").`;
                this.dom.statusMessage.className = "info";
                if (this.dom.elementInput) {
                    this.dom.elementInput.disabled = false;
                    this.dom.elementInput.value = "";
                    this.dom.elementInput.focus();
                }
                if (this.dom.submitBtn) this.dom.submitBtn.disabled = false;
            }
        }

        this.saveCurrentProgress();
    }

    goToNextUnsolvedWord() {
        if (this.dom.nextWordQuickBtn) {
            this.dom.nextWordQuickBtn.style.display = "none";
        }

        // Look for next unsolved word starting after current index
        let nextIdx = -1;
        for (let i = 1; i < this.dailyWords.length; i++) {
            const checkIdx = (this.currentWordIdx + i) % this.dailyWords.length;
            if (!this.wordStates[checkIdx].isSolved) {
                nextIdx = checkIdx;
                break;
            }
        }

        if (nextIdx !== -1) {
            this.selectWord(nextIdx);
        }
    }

    renderTargetWord() {
        if (!this.dom.targetWordDisplay) return;

        const matchedLen = this.getMatchedPrefixLength();
        const matched = this.currentWord.slice(0, matchedLen);
        const remaining = this.currentWord.slice(matchedLen);
        this.dom.targetWordDisplay.innerHTML = `<span class="matched-chars">${matched}</span><span class="unmatched-chars">${remaining}</span>`;
    }

    renderElementSlots() {
        if (!this.dom.elementSlotsRow) return;
        this.dom.elementSlotsRow.innerHTML = "";
        this.updateTrashCanState();
        this.updateButtonsState();

        if (this.placedElements.length === 0) {
            this.dom.elementSlotsRow.innerHTML = `<span class="empty-tiles-placeholder">Enter elements to spell "${this.currentWord}" (drag to reorder or 🗑️ to delete)</span>`;
            return;
        }

        let charOffset = 0;
        const target = (this.currentWord || "").toUpperCase();
        const isCurrentSolved = this.wordStates[this.currentWordIdx]?.isSolved;

        for (let i = 0; i < this.placedElements.length; i++) {
            const elem = this.placedElements[i];
            const sym = elem.symbol.toUpperCase();
            const targetSlice = target.slice(charOffset, charOffset + sym.length);
            const isMatch = (targetSlice === sym);
            charOffset += sym.length;

            const tile = document.createElement("div");
            tile.className = `element-slot filled ${isMatch ? "match" : "mismatch"}`;
            tile.dataset.symbol = elem.symbol;
            tile.dataset.index = i;
            tile.draggable = (!this.isGameOver && !isCurrentSolved);
            tile.title = isMatch
                ? `${elem.name} (${elem.symbol}) matches "${sym}" — drag to reorder or 🗑️ to delete`
                : `${elem.name} (${elem.symbol}) does not match "${targetSlice || 'end'}" — drag to reorder or 🗑️ to delete`;

            tile.innerHTML = `
                <span class="slot-num">${elem.number}</span>
                <span class="slot-symbol">${elem.symbol}</span>
                <span class="slot-name">${elem.name}</span>
                ${!isCurrentSolved ? `<button class="slot-delete-btn" title="Delete ${elem.name} (&times;)" aria-label="Delete ${elem.name}">&times;</button>` : ''}
            `;

            tile.addEventListener("mouseenter", () => this.showElementDetails(elem));
            tile.addEventListener("click", (e) => {
                if (e.target.closest(".slot-delete-btn")) return;
                this.showElementDetails(elem);
            });

            // Delete button
            const deleteBtn = tile.querySelector(".slot-delete-btn");
            if (deleteBtn) {
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.deleteElementAtIndex(i);
                });
            }

            // HTML5 Drag Events: Drag to Trash OR Drag onto another tile to reorder!
            tile.addEventListener("dragstart", (e) => {
                this.draggedElementIndex = i;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
                tile.classList.add("dragging");
                if (this.dom.trashCanZone) {
                    this.dom.trashCanZone.classList.add("drag-active");
                    if (this.dom.trashCanLabel) this.dom.trashCanLabel.textContent = `Drop [${elem.symbol}] to delete`;
                }
            });

            tile.addEventListener("dragend", () => {
                tile.classList.remove("dragging");
                document.querySelectorAll(".element-slot.drop-target").forEach(el => el.classList.remove("drop-target"));
                if (this.dom.trashCanZone) {
                    this.dom.trashCanZone.classList.remove("drag-active", "drag-over");
                    if (this.dom.trashCanLabel) this.dom.trashCanLabel.textContent = "Drag element here to delete";
                }
                this.draggedElementIndex = null;
            });

            tile.addEventListener("dragover", (e) => {
                if (this.isGameOver || isCurrentSolved) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (this.draggedElementIndex !== null && this.draggedElementIndex !== i) {
                    tile.classList.add("drop-target");
                }
            });

            tile.addEventListener("dragleave", () => {
                tile.classList.remove("drop-target");
            });

            tile.addEventListener("drop", (e) => {
                if (this.isGameOver || isCurrentSolved) return;
                e.preventDefault();
                tile.classList.remove("drop-target");
                const fromIdx = this.draggedElementIndex;
                if (fromIdx !== null && fromIdx !== i && fromIdx >= 0 && fromIdx < this.placedElements.length) {
                    const movedItem = this.placedElements.splice(fromIdx, 1)[0];
                    this.placedElements.splice(i, 0, movedItem);
                    this.renderTargetWord();
                    this.renderElementSlots();
                    this.checkSolveVictory();
                }
            });

            // Touch Screen Support (Mobile / Tablet dragging)
            let touchStartX = 0;
            let touchStartY = 0;
            tile.addEventListener("touchstart", (e) => {
                if (this.isGameOver || isCurrentSolved) return;
                const touch = e.touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                this.draggedElementIndex = i;
            }, { passive: true });

            tile.addEventListener("touchmove", (e) => {
                if (this.isGameOver || isCurrentSolved || this.draggedElementIndex === null) return;
                const touch = e.touches[0];
                if (Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY) > 15) {
                    if (this.dom.trashCanZone) {
                        this.dom.trashCanZone.classList.add("drag-active");
                        const rect = this.dom.trashCanZone.getBoundingClientRect();
                        const isOver = (
                            touch.clientX >= rect.left &&
                            touch.clientX <= rect.right &&
                            touch.clientY >= rect.top &&
                            touch.clientY <= rect.bottom
                        );
                        this.dom.trashCanZone.classList.toggle("drag-over", isOver);
                    }
                }
            }, { passive: true });

            tile.addEventListener("touchend", () => {
                if (this.dom.trashCanZone && this.dom.trashCanZone.classList.contains("drag-over")) {
                    this.deleteElementAtIndex(i);
                }
                if (this.dom.trashCanZone) {
                    this.dom.trashCanZone.classList.remove("drag-active", "drag-over");
                }
                this.draggedElementIndex = null;
            }, { passive: true });

            this.dom.elementSlotsRow.appendChild(tile);
        }
    }

    updateTrashCanState() {
        const isCurrentSolved = this.wordStates[this.currentWordIdx]?.isSolved;
        const hasElems = this.placedElements.length > 0 && !this.isGameOver && this.isWordRevealed && !isCurrentSolved;
        if (this.dom.trashCanZone) {
            this.dom.trashCanZone.classList.toggle("has-elements", hasElems);
            if (!hasElems) {
                this.dom.trashCanZone.classList.remove("drag-active", "drag-over");
                if (this.dom.trashCanLabel) this.dom.trashCanLabel.textContent = "Trash Can (empty)";
            } else {
                if (this.dom.trashCanLabel) this.dom.trashCanLabel.textContent = "Drag element here to delete";
            }
        }
        if (this.dom.dragHintText) {
            this.dom.dragHintText.classList.toggle("visible", hasElems);
        }
    }

    updateButtonsState() {
        const isCurrentSolved = this.wordStates[this.currentWordIdx]?.isSolved;
        const hasPlaced = this.placedElements.length > 0 && !this.isGameOver && !isCurrentSolved;

        if (this.dom.undoBtn) {
            this.dom.undoBtn.disabled = !hasPlaced;
        }
        if (this.dom.clearWordBtn) {
            this.dom.clearWordBtn.disabled = !hasPlaced;
        }
    }

    deleteElementAtIndex(deleteIndex) {
        const isCurrentSolved = this.wordStates[this.currentWordIdx]?.isSolved;
        if (this.isGameOver || isCurrentSolved) return;
        if (deleteIndex < 0 || deleteIndex >= this.placedElements.length) return;

        const deletedElem = this.placedElements[deleteIndex];
        this.placedElements.splice(deleteIndex, 1);

        this.renderTargetWord();
        this.renderElementSlots();
        this.updateTrashCanState();
        this.updateButtonsState();

        this.dom.statusMessage.textContent = `Deleted [${deletedElem.symbol}] ${deletedElem.name}.`;
        this.dom.statusMessage.className = "info";

        this.checkSolveVictory();
        this.saveCurrentProgress();

        if (this.dom.elementInput) {
            this.dom.elementInput.focus();
        }
    }

    handleGuess(directInput = null) {
        if (this.isGameOver) return;
        const currentWordState = this.wordStates[this.currentWordIdx];
        if (currentWordState && currentWordState.isSolved) {
            this.goToNextUnsolvedWord();
            return;
        }

        const inputVal = directInput !== null
            ? String(directInput).trim()
            : (this.dom.elementInput ? this.dom.elementInput.value : "").trim();

        if (!inputVal) return;

        // Auto-start timer on first element placement if not already running
        if (!this.timerInterval && !this.isGameOver) {
            this.startSolveTimer(this.elapsedOffsetMs || 0);
        }

        // Use robust element parser (handles symbol, name, "C - Carbon", atomic #)
        const elem = parseElementInput(inputVal);

        if (!elem) {
            this.dom.statusMessage.textContent = `"${inputVal}" is not a recognized chemical element.`;
            this.dom.statusMessage.className = "error";

            if (this.dom.elementInput && directInput === null) {
                this.dom.elementInput.classList.remove("shake-error");
                void this.dom.elementInput.offsetWidth; // Force reflow
                this.dom.elementInput.classList.add("shake-error");
                this.dom.elementInput.select();
            }
            return;
        }

        // Place element down freely
        this.placedElements.push(elem);

        this.renderTargetWord();
        this.renderElementSlots();
        this.showElementDetails(elem);
        this.updateButtonsState();

        if (this.dom.elementInput && directInput === null) {
            this.dom.elementInput.value = "";
            this.dom.elementInput.focus();
        }

        this.checkSolveVictory();
        this.saveCurrentProgress();
    }

    checkSolveVictory() {
        const spelled = this.placedElements.map(e => e.symbol).join("").toUpperCase();
        const target = (this.currentWord || "").toUpperCase();

        if (spelled === target && target.length > 0) {
            this.handleCurrentWordSolved();
        } else {
            if (this.placedElements.length === 0) {
                this.dom.statusMessage.textContent = `Enter elements to spell Word #${this.currentWordIdx + 1} ("${this.currentWord}")!`;
                this.dom.statusMessage.className = "info";
            } else if (target.startsWith(spelled)) {
                this.dom.statusMessage.textContent = `Spelled "${spelled}"... matches so far!`;
                this.dom.statusMessage.className = "success";
            } else {
                this.dom.statusMessage.textContent = `Placed elements spell "${spelled}". (Target: ${target})`;
                this.dom.statusMessage.className = "info";
            }
            this.saveCurrentProgress();
        }
    }

    handleCurrentWordSolved() {
        const wordIdx = this.currentWordIdx;
        const currentWord = this.currentWord;
        const state = this.wordStates[wordIdx];
        state.isSolved = true;
        state.placedElements = [...this.placedElements];

        this.renderWordPicker();
        this.renderTargetWord();
        this.renderElementSlots();

        const solvedCount = this.wordStates.filter(s => s.isSolved).length;
        const totalWords = this.dailyWords.length;

        if (solvedCount >= totalWords) {
            // All 6 words solved!
            this.handleFullVictory();
        } else {
            // Intermediate word solved: celebrate and advance
            this.dom.statusMessage.textContent = `🎉 Word #${wordIdx + 1} ("${currentWord}") Solved! (${solvedCount}/${totalWords} Complete)`;
            this.dom.statusMessage.className = "success";

            if (this.dom.nextWordQuickBtn) {
                this.dom.nextWordQuickBtn.style.display = "inline-block";
                this.dom.nextWordQuickBtn.textContent = `Next Word (${solvedCount + 1}/${totalWords}) ▶`;
            }

            this.saveCurrentProgress();

            // Smooth automatic transition to the next unsolved word after brief celebration
            setTimeout(() => {
                if (!this.isGameOver && this.wordStates[this.currentWordIdx]?.isSolved) {
                    this.goToNextUnsolvedWord();
                }
            }, 750);
        }
    }

    handleFullVictory() {
        this.isGameOver = true;
        this.stopSolveTimer();
        this.solveTimeMs = Math.max(100, Date.now() - this.startTime);

        const totalWords = this.dailyWords.length;
        if (!this.isPractice) {
            recordCompletion(
                this.currentDateStr,
                this.puzzleNumber,
                this.dailyWords,
                true,
                this.wordStates.map(ws => ({
                    word: ws.word,
                    placedElements: (ws.placedElements || []).map(e => ({
                        symbol: e.symbol,
                        name: e.name,
                        number: e.number
                    })),
                    isSolved: ws.isSolved,
                    solveTimeMs: ws.solveTimeMs
                })),
                this.solveTimeMs
            );
            clearDailyProgress(this.currentDateStr);
        }

        const formatted = formatTimeMs(this.solveTimeMs);
        this.dom.statusMessage.textContent = totalWords > 1
            ? `🎉 Fantastic! All ${totalWords} words solved in ${formatted}!`
            : `🎉 Fantastic! Word solved in ${formatted}!`;
        this.dom.statusMessage.className = "success";

        if (this.dom.solvedCard) {
            this.dom.solvedCard.style.display = "block";
            this.dom.solvedTimeStat.textContent = totalWords > 1
                ? `All ${totalWords} Words Solved in ${formatted}`
                : `Solved in ${formatted}`;
            this.renderSolvedCardBreakdown();
        }

        if (this.dom.inputGroupArea) {
            this.dom.inputGroupArea.style.display = "none";
        }
        if (this.dom.nextWordQuickBtn) {
            this.dom.nextWordQuickBtn.style.display = "none";
        }

        this.updateTrashCanState();
        this.updateButtonsState();

        // Open stats modal after celebration pause
        setTimeout(() => {
            this.renderStatsModal();
            this.openModal(this.dom.statsModal);
        }, 800);
    }

    renderSolvedCardBreakdown() {
        if (!this.dom.solvedWordsBreakdown) return;
        this.dom.solvedWordsBreakdown.innerHTML = this.dailyWords.map((word, i) => {
            const state = this.wordStates[i];
            const elems = state?.placedElements || [];
            const chipsHtml = elems.length > 0
                ? elems.map(e => `<span class="solved-breakdown-chip">[${e.symbol}]</span>`).join("")
                : `<span style="color: #888; font-style: italic;">Solved</span>`;
            const prefix = this.dailyWords.length > 1 ? `${i + 1}. ` : "";
            return `
                <div class="solved-breakdown-item">
                    <span class="solved-breakdown-word">${prefix}${word}</span>
                    <div class="solved-breakdown-elements">${chipsHtml}</div>
                </div>
            `;
        }).join("");
    }

    handleUndo() {
        const isCurrentSolved = this.wordStates[this.currentWordIdx]?.isSolved;
        if (this.isGameOver || isCurrentSolved || this.placedElements.length === 0) return;
        const removed = this.placedElements.pop();

        this.renderTargetWord();
        this.renderElementSlots();
        this.updateTrashCanState();
        this.updateButtonsState();

        this.dom.statusMessage.textContent = `Undid [${removed.symbol}] ${removed.name}.`;
        this.dom.statusMessage.className = "info";

        this.checkSolveVictory();
        this.saveCurrentProgress();

        if (this.dom.elementInput) {
            this.dom.elementInput.focus();
        }
    }

    handleClearWord() {
        const isCurrentSolved = this.wordStates[this.currentWordIdx]?.isSolved;
        if (this.isGameOver || isCurrentSolved || this.placedElements.length === 0) return;

        this.placedElements = [];
        this.renderTargetWord();
        this.renderElementSlots();
        this.updateTrashCanState();
        this.updateButtonsState();

        this.dom.statusMessage.textContent = `Cleared elements for Word #${this.currentWordIdx + 1} ("${this.currentWord}").`;
        this.dom.statusMessage.className = "info";

        if (this.dom.elementInput) {
            this.dom.elementInput.focus();
        }
        this.saveCurrentProgress();
    }

    async handleReset(confirmPrompt = true) {
        if (confirmPrompt && (this.timerInterval || this.isGameOver || this.wordStates.some(w => w.isSolved || w.placedElements.length > 0))) {
            const msg = `Reset Element-Speller #${this.puzzleNumber} (All 6 Words)?\n\nThis will restart your progress so you can solve from scratch!`;
            if (!confirm(msg)) {
                return;
            }
        }

        if (!this.isPractice && this.currentDateStr) {
            await resetDailyGameResult(this.currentDateStr);
            clearDailyProgress(this.currentDateStr);
            const pInfo = getDailyWords(this.currentDateStr, 6);
            this.dailyWords = pInfo.words;
            this.puzzleNumber = pInfo.puzzleNumber;
            const isToday = this.currentDateStr === this.todayStr;
            this.dom.puzzleTitle.textContent = isToday
                ? `📅 Daily Puzzle #${this.puzzleNumber} • ${this.currentDateStr} • 6 Words`
                : `📅 Past Puzzle #${this.puzzleNumber} • ${this.currentDateStr} • 6 Words`;
        }

        this.isGameOver = false;
        this.isWordRevealed = true;
        this.currentWordIdx = 0;
        this.solveTimeMs = null;
        this.elapsedOffsetMs = 0;
        this.stopSolveTimer();
        this.dom.liveTimerDisplay.textContent = "00:00.0";

        // Reset all word states
        this.wordStates = this.dailyWords.map(word => ({
            word,
            placedElements: [],
            isSolved: false,
            solveTimeMs: null
        }));

        if (this.dom.undoBtn) this.dom.undoBtn.disabled = true;
        if (this.dom.clearWordBtn) this.dom.clearWordBtn.disabled = true;
        if (this.dom.solvedCard) this.dom.solvedCard.style.display = "none";
        if (this.dom.inputGroupArea) this.dom.inputGroupArea.style.display = "block";
        if (this.dom.nextWordQuickBtn) this.dom.nextWordQuickBtn.style.display = "none";

        this.renderWordPicker();
        this.renderTargetWord();
        this.renderElementSlots();

        if (this.dom.elementInput) {
            this.dom.elementInput.value = "";
            this.dom.elementInput.disabled = false;
            this.dom.elementInput.placeholder = "Enter element name or symbol (e.g. Carbon, C)...";
            this.dom.elementInput.focus();
        }
        if (this.dom.submitBtn) {
            this.dom.submitBtn.disabled = false;
        }

        this.dom.statusMessage.textContent = "Puzzle reset! Choose any word and enter elements to start. (Timer starts on first move)";
        this.dom.statusMessage.className = "info";

        if (this.dom.archiveModal.classList.contains("active")) {
            this.renderCalendarView();
            this.renderArchiveList();
        }
    }

    saveCurrentProgress() {
        if (this.isPractice || !this.currentDateStr || this.isGameOver) return;
        const elapsed = this.startTime ? (Date.now() - this.startTime) : (this.elapsedOffsetMs || 0);
        const cleanWordStates = this.wordStates.map(ws => ({
            word: ws.word,
            placedElements: (ws.placedElements || []).map(e => ({
                symbol: e.symbol,
                name: e.name,
                number: e.number
            })),
            isSolved: !!ws.isSolved,
            solveTimeMs: ws.solveTimeMs || null
        }));
        saveDailyProgress(this.currentDateStr, {
            currentWordIdx: this.currentWordIdx,
            wordStates: cleanWordStates,
            elapsedTimeMs: elapsed,
            timestamp: Date.now()
        });
    }

    showElementDetails(elem) {
        if (!elem) return;
        if (this.periodicTable) {
            const pElem = this.periodicTable.findElementBySymbol(elem.symbol);
            if (pElem) {
                this.periodicTable.selectElement(pElem);
            }
        }
    }

    openModal(modal) {
        if (modal) modal.classList.add("active");
    }

    closeModal(modal) {
        if (modal) modal.classList.remove("active");
    }

    renderStatsModal() {
        const stats = getStats();
        if (this.dom.statPlayed) this.dom.statPlayed.textContent = stats.played;
        if (this.dom.statWinPct) this.dom.statWinPct.textContent = stats.played > 0 ? `${Math.round((stats.won / stats.played) * 100)}%` : "0%";
        if (this.dom.statStreak) this.dom.statStreak.textContent = stats.currentStreak;
        if (this.dom.statMaxStreak) this.dom.statMaxStreak.textContent = stats.maxStreak || stats.currentStreak || 0;
        if (this.dom.statBestTime) this.dom.statBestTime.textContent = formatTimeMs(stats.bestTimeMs);
        if (this.dom.statAvgTime) {
            const avgMs = (stats.won > 0 && stats.totalTimeMs) ? Math.round(stats.totalTimeMs / stats.won) : null;
            this.dom.statAvgTime.textContent = formatTimeMs(avgMs);
        }

        // Current / Selected Puzzle Status in Stats Modal
        if (this.dom.statsPuzzleTitle) {
            this.dom.statsPuzzleTitle.textContent = this.isPractice ? "Practice Puzzle" : `Daily Puzzle #${this.puzzleNumber}`;
        }

        const dateKey = this.currentDateStr || this.todayStr;
        const rec = (!this.isPractice && dateKey) ? getRecordForDate(dateKey) : null;
        const solveMs = (this.solveTimeMs && this.solveTimeMs > 0)
            ? this.solveTimeMs
            : (rec && rec.solveTimeMs > 0 ? rec.solveTimeMs : null);
        const isSolved = this.isGameOver || (rec && rec.won);

        if (this.dom.statsPuzzleTime) {
            if (isSolved && solveMs) {
                this.dom.statsPuzzleTime.textContent = `⏱️ ${formatTimeMs(solveMs)}`;
            } else if (this.isWordRevealed && !this.isGameOver) {
                this.dom.statsPuzzleTime.textContent = "⏱️ In Progress";
            } else {
                this.dom.statsPuzzleTime.textContent = "⏱️ Not Started";
            }
        }

        if (this.dom.statsPuzzleStatus) {
            const totalWords = this.dailyWords.length;
            if (isSolved) {
                this.dom.statsPuzzleStatus.textContent = totalWords > 1 ? `🎉 All ${totalWords} words solved!` : "🎉 Word solved!";
            } else if (this.isWordRevealed) {
                const solvedCount = this.wordStates.filter(s => s.isSolved).length;
                this.dom.statsPuzzleStatus.textContent = `${solvedCount} of ${totalWords} words solved`;
            } else {
                this.dom.statsPuzzleStatus.textContent = "Click 'Reveal' to begin playing!";
            }
        }
    }

    copyShareCard(withSpoiler = false, targetBtn = null) {
        const totalWords = this.dailyWords.length || 6;
        const isMulti = totalWords > 1;
        const puzzleTag = this.isPractice
            ? "Element-Speller Practice"
            : (isMulti ? `Element-Speller #${this.puzzleNumber} (${totalWords} Words)` : `Element-Speller #${this.puzzleNumber}`);
        const dateKey = this.currentDateStr || this.todayStr;
        const rec = (!this.isPractice && dateKey) ? getRecordForDate(dateKey) : null;
        const solveMs = (this.solveTimeMs && this.solveTimeMs > 0)
            ? this.solveTimeMs
            : (rec && rec.solveTimeMs > 0 ? rec.solveTimeMs : null);

        const isSolved = this.isGameOver || (rec && rec.won);
        const solvedCount = (this.wordStates && this.wordStates.length > 0)
            ? this.wordStates.filter(s => s.isSolved).length
            : (isSolved ? totalWords : 0);

        let timeHeader;
        if (solveMs) {
            timeHeader = isMulti
                ? `⏱️ Time: ${formatTimeMs(solveMs)} (${solvedCount}/${totalWords} Solved)`
                : `⏱️ Solved in ${formatTimeMs(solveMs)}`;
        } else if (this.isWordRevealed && !this.isGameOver) {
            timeHeader = `⏱️ In Progress (${solvedCount}/${totalWords} Solved)`;
        } else {
            timeHeader = `(${solvedCount}/${totalWords} Solved)`;
        }

        let lines;
        if (withSpoiler) {
            lines = this.dailyWords.map((word, i) => {
                const state = this.wordStates[i];
                if ((state && state.isSolved) || isSolved) {
                    const elems = state?.placedElements || rec?.wordRecords?.[i]?.placedElements || (totalWords === 1 ? rec?.elementsUsed : []) || [];
                    const boxes = elems.map(e => `[${e.symbol}]`).join(" ");
                    return isMulti ? `${i + 1}. ${word}: ${boxes}` : `${word}: ${boxes}`;
                } else {
                    return isMulti ? `${i + 1}. ${word}: In Progress` : `${word}: In Progress`;
                }
            });
        } else {
            lines = this.dailyWords.map((word, i) => {
                const state = this.wordStates[i];
                if ((state && state.isSolved) || isSolved) {
                    const elems = state?.placedElements || rec?.wordRecords?.[i]?.placedElements || (totalWords === 1 ? rec?.elementsUsed : []) || [];
                    const count = Math.max(1, elems.length);
                    return isMulti ? `${i + 1}. ${'🟩 '.repeat(count).trim()}` : `${'🟩 '.repeat(count).trim()}`;
                } else {
                    const len = Math.max(1, Math.ceil(word.length / 2));
                    return isMulti ? `${i + 1}. ${'⬜ '.repeat(len).trim()}` : `${'⬜ '.repeat(len).trim()}`;
                }
            });
        }

        const shareText = `🧪 ${puzzleTag}\n${timeHeader}\n\n${lines.join("\n")}\n\nhttps://amitjoshi2724.github.io/Element-Speller/`;

        navigator.clipboard.writeText(shareText).then(() => {
            if (targetBtn) {
                const originalHtml = targetBtn.innerHTML;
                targetBtn.textContent = withSpoiler ? "✅ Copied (With Spoilers)!" : "✅ Copied (No Spoilers)!";
                setTimeout(() => {
                    targetBtn.innerHTML = originalHtml;
                }, 2200);
            }
        }).catch(() => {
            alert(shareText);
        });
    }

    // ---------------------------------------------------------------------------
    // Mastermindle-Style Calendar & List View Archive
    // ---------------------------------------------------------------------------

    setupArchiveTabs() {
        if (this.dom.archiveTabCal && this.dom.archiveTabList) {
            this.dom.archiveTabCal.onclick = () => {
                this.dom.archiveTabCal.classList.add("active");
                this.dom.archiveTabList.classList.remove("active");
                this.dom.calView.style.display = "block";
                this.dom.listView.style.display = "none";
                this.renderCalendarView();
            };

            this.dom.archiveTabList.onclick = () => {
                this.dom.archiveTabList.classList.add("active");
                this.dom.archiveTabCal.classList.remove("active");
                this.dom.listView.style.display = "block";
                this.dom.calView.style.display = "none";
                this.renderArchiveList();
            };
        }

        // Year select
        if (this.dom.calYearSelect) {
            this.dom.calYearSelect.innerHTML = "";
            const currentYear = parseDate(this.todayStr).getFullYear();
            for (let y = currentYear; y >= 2025; y--) {
                const opt = document.createElement("option");
                opt.value = String(y);
                opt.textContent = String(y);
                this.dom.calYearSelect.appendChild(opt);
            }
            this.dom.calYearSelect.value = String(this.calYear);
            this.dom.calYearSelect.onchange = (e) => {
                this.calYear = Number(e.target.value);
                this.renderCalendarView();
            };
        }

        // Month select
        if (this.dom.calMonthSelect) {
            this.dom.calMonthSelect.value = String(this.calMonth);
            this.dom.calMonthSelect.onchange = (e) => {
                this.calMonth = Number(e.target.value);
                this.renderCalendarView();
            };
        }

        // Month navigation buttons
        if (this.dom.calPrevBtn) {
            this.dom.calPrevBtn.onclick = () => {
                this.calMonth--;
                if (this.calMonth < 0) {
                    this.calMonth = 11;
                    this.calYear--;
                }
                this.renderCalendarView();
            };
        }

        if (this.dom.calNextBtn) {
            this.dom.calNextBtn.onclick = () => {
                this.calMonth++;
                if (this.calMonth > 11) {
                    this.calMonth = 0;
                    this.calYear++;
                }
                this.renderCalendarView();
            };
        }

        if (this.dom.calTodayBtn) {
            this.dom.calTodayBtn.onclick = () => {
                const t = parseDate(this.todayStr);
                this.calYear = t.getFullYear();
                this.calMonth = t.getMonth();
                this.renderCalendarView();
            };
        }

        // List view search & filter buttons
        if (this.dom.archiveSearchInput) {
            this.dom.archiveSearchInput.oninput = () => {
                this.renderArchiveList(this.dom.archiveSearchInput.value);
            };
        }

        document.querySelectorAll(".archive-filter-btn").forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll(".archive-filter-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.renderArchiveList(this.dom.archiveSearchInput ? this.dom.archiveSearchInput.value : "");
            };
        });
    }

    renderCalendarView() {
        const container = this.dom.calDaysContainer;
        if (!container) return;

        const todayDate = parseDate(this.todayStr);

        if (this.dom.calMonthSelect) this.dom.calMonthSelect.value = String(this.calMonth);
        if (this.dom.calYearSelect) this.dom.calYearSelect.value = String(this.calYear);

        // Disable Next when at or past today's month
        if (this.dom.calNextBtn) {
            const isFutureMonth =
                this.calYear > todayDate.getFullYear() ||
                (this.calYear === todayDate.getFullYear() && this.calMonth >= todayDate.getMonth());
            this.dom.calNextBtn.disabled = isFutureMonth;
        }

        const firstDayIndex = new Date(this.calYear, this.calMonth, 1).getDay(); // 0 = Sunday
        const totalDaysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();

        const history = getHistory();
        const cellsHtml = [];
        const TOTAL_SLOTS = 42; // Fixed 6 weeks for layout stability

        // Leading empty cells
        for (let i = 0; i < firstDayIndex; i++) {
            cellsHtml.push('<div class="calendar-day-cell is-empty"></div>');
        }

        // Day cells
        for (let day = 1; day <= totalDaysInMonth; day++) {
            const dateStr = `${this.calYear}-${String(this.calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isFuture = dateStr > this.todayStr;
            const isToday = dateStr === this.todayStr;

            if (isFuture) {
                cellsHtml.push(`
                    <div class="calendar-day-cell is-future">
                        <div class="cal-day-num">${day}</div>
                    </div>
                `);
                continue;
            }

            const pNum = getPuzzleNumber(dateStr);
            const record = history[dateStr];

            let statusClass = "status-unplayed";
            let statusTag = "⚪";

            if (record && record.won) {
                statusClass = "status-won";
                statusTag = `⭐ ${formatTimeMs(record.solveTimeMs)}`;
            }

            cellsHtml.push(`
                <div class="calendar-day-cell ${statusClass} ${isToday ? "is-today" : ""}"
                     data-date="${dateStr}" title="Puzzle #${pNum} — ${dateStr}">
                    <div class="cal-day-num">${day}</div>
                    <div class="cal-puzzle-num">#${pNum}</div>
                    <div class="cal-status-tag">${statusTag}</div>
                </div>
            `);
        }

        // Trailing empty cells to fill 42 slots
        const filled = firstDayIndex + totalDaysInMonth;
        for (let i = filled; i < TOTAL_SLOTS; i++) {
            cellsHtml.push('<div class="calendar-day-cell is-empty"></div>');
        }

        container.innerHTML = cellsHtml.join("");

        // Click to load selected date puzzle
        container.querySelectorAll(".calendar-day-cell:not(.is-empty):not(.is-future)").forEach(el => {
            el.onclick = () => {
                const date = el.dataset.date;
                this.closeModal(this.dom.archiveModal);
                this.startPuzzle(date, false);
            };
        });
    }

    renderArchiveList(searchFilter = "") {
        const container = this.dom.archiveListContainer;
        if (!container) return;

        const history = getHistory();
        const todayNum = getPuzzleNumber(this.todayStr);
        const activeFilterBtn = document.querySelector(".archive-filter-btn.active");
        const filterMode = activeFilterBtn ? activeFilterBtn.dataset.filter : "all";

        const items = [];

        for (let pNum = todayNum; pNum >= 1; pNum--) {
            const dateStr = getDateForPuzzleNumber(pNum);
            const record = history[dateStr];
            const isSolved = record && record.won;
            const isPlayed = !!record;

            if (filterMode === "solved" && !isSolved) continue;
            if (filterMode === "unplayed" && isPlayed) continue;

            if (searchFilter) {
                const query = searchFilter.toLowerCase();
                if (!dateStr.includes(query) && !String(pNum).includes(query)) continue;
            }

            items.push({ pNum, dateStr, record, isSolved, isPlayed });
        }

        if (items.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: #888; text-align: center;">No puzzles match this filter.</div>';
            return;
        }

        container.innerHTML = items.map(item => {
            const isSolved = item.isSolved;
            const badgeClass = isSolved ? "archive-status-badge won" : "archive-status-badge unplayed";
            let badgeText = "⚪ Unplayed";
            if (isSolved) {
                const rec = item.record;
                const isMulti = rec && rec.wordRecords && Array.isArray(rec.wordRecords) && rec.wordRecords.length > 1;
                const count = isMulti ? rec.wordRecords.length : 1;
                badgeText = `⭐ Solved ${count}/${count} (${formatTimeMs(rec.solveTimeMs)})`;
            }
            return `
                <div class="archive-item">
                    <div class="archive-meta">
                        <span class="archive-pnum">Element-Speller #${item.pNum}</span>
                        <span class="archive-date">${item.dateStr}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="${badgeClass}">${badgeText}</span>
                        <button class="archive-play-btn" data-date="${item.dateStr}">${isSolved ? "Review" : "Play"}</button>
                    </div>
                </div>
            `;
        }).join("");

        container.querySelectorAll(".archive-play-btn").forEach(btn => {
            btn.onclick = (e) => {
                const date = e.target.dataset.date;
                this.closeModal(this.dom.archiveModal);
                this.startPuzzle(date, false);
            };
        });
    }

    startMidnightCountdown() {
        const update = () => {
            const now = new Date();
            const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
            const diffMs = tomorrow - now;
            const hours = String(Math.floor(diffMs / (1000 * 60 * 60))).padStart(2, "0");
            const minutes = String(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0");
            const seconds = String(Math.floor((diffMs % (1000 * 60)) / 1000)).padStart(2, "0");
            if (this.dom.nextCountdown) {
                this.dom.nextCountdown.textContent = `${hours}:${minutes}:${seconds}`;
            }
        };
        update();
        setInterval(update, 1000);
    }
}

// Safe Boot: Works both on fresh load and when DOM is already complete/cached (macOS Dock PWA)
function bootElementSpeller() {
    if (window.elementSpellerGame) return;
    try {
        window.elementSpellerGame = new ElementSpellerGame();
        window.elementleGame = window.elementSpellerGame;
        console.log("Element-Speller initialized successfully.");
    } catch (err) {
        console.error("Failed to start Element-Speller:", err);
        const badge = document.getElementById("puzzle-meta-badge");
        if (badge) badge.textContent = "Error loading puzzle. Please refresh!";
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootElementSpeller);
} else {
    bootElementSpeller();
}

// Register Service Worker for PWA offline & Dock capability
if ("serviceWorker" in navigator && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
    navigator.serviceWorker
        .register("./sw.js", { scope: "./" })
        .then((reg) => {
            console.log("Element-Speller Service Worker registered with scope:", reg.scope);
            reg.onupdatefound = () => {
                const installing = reg.installing;
                if (installing) {
                    installing.onstatechange = () => {
                        if (installing.state === "installed" && navigator.serviceWorker.controller) {
                            console.log("New game assets cached in background.");
                        }
                    };
                }
            };
        })
        .catch((err) => {
            console.warn("Element-Speller Service Worker registration failed:", err);
        });
}
