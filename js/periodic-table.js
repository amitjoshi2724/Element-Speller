/**
 * Interactive Periodic Table Component for ElementSpeller
 * Provides newcomers and chemistry enthusiasts a full 118-element visual table.
 * Allows searching, inspecting element properties, and directly inserting
 * elements into the active puzzle.
 */
import { elementData } from './elements.js';

export const CATEGORY_LABELS = {
    'nonmetal': 'Reactive Nonmetal',
    'noble-gas': 'Noble Gas',
    'alkali': 'Alkali Metal',
    'alkaline-earth': 'Alkaline Earth Metal',
    'metalloid': 'Metalloid',
    'halogen': 'Halogen',
    'transition': 'Transition Metal',
    'post-transition': 'Post-Transition Metal',
    'lanthanide': 'Lanthanide',
    'actinide': 'Actinide',
    'unknown': 'Unknown Properties'
};

export const PERIODIC_ELEMENTS = [
    // Period 1
    { n: 1, s: 'H', r: 1, c: 1, cat: 'nonmetal' },
    { n: 2, s: 'He', r: 1, c: 18, cat: 'noble-gas' },
    // Period 2
    { n: 3, s: 'Li', r: 2, c: 1, cat: 'alkali' },
    { n: 4, s: 'Be', r: 2, c: 2, cat: 'alkaline-earth' },
    { n: 5, s: 'B', r: 2, c: 13, cat: 'metalloid' },
    { n: 6, s: 'C', r: 2, c: 14, cat: 'nonmetal' },
    { n: 7, s: 'N', r: 2, c: 15, cat: 'nonmetal' },
    { n: 8, s: 'O', r: 2, c: 16, cat: 'nonmetal' },
    { n: 9, s: 'F', r: 2, c: 17, cat: 'halogen' },
    { n: 10, s: 'Ne', r: 2, c: 18, cat: 'noble-gas' },
    // Period 3
    { n: 11, s: 'Na', r: 3, c: 1, cat: 'alkali' },
    { n: 12, s: 'Mg', r: 3, c: 2, cat: 'alkaline-earth' },
    { n: 13, s: 'Al', r: 3, c: 13, cat: 'post-transition' },
    { n: 14, s: 'Si', r: 3, c: 14, cat: 'metalloid' },
    { n: 15, s: 'P', r: 3, c: 15, cat: 'nonmetal' },
    { n: 16, s: 'S', r: 3, c: 16, cat: 'nonmetal' },
    { n: 17, s: 'Cl', r: 3, c: 17, cat: 'halogen' },
    { n: 18, s: 'Ar', r: 3, c: 18, cat: 'noble-gas' },
    // Period 4
    { n: 19, s: 'K', r: 4, c: 1, cat: 'alkali' },
    { n: 20, s: 'Ca', r: 4, c: 2, cat: 'alkaline-earth' },
    { n: 21, s: 'Sc', r: 4, c: 3, cat: 'transition' },
    { n: 22, s: 'Ti', r: 4, c: 4, cat: 'transition' },
    { n: 23, s: 'V', r: 4, c: 5, cat: 'transition' },
    { n: 24, s: 'Cr', r: 4, c: 6, cat: 'transition' },
    { n: 25, s: 'Mn', r: 4, c: 7, cat: 'transition' },
    { n: 26, s: 'Fe', r: 4, c: 8, cat: 'transition' },
    { n: 27, s: 'Co', r: 4, c: 9, cat: 'transition' },
    { n: 28, s: 'Ni', r: 4, c: 10, cat: 'transition' },
    { n: 29, s: 'Cu', r: 4, c: 11, cat: 'transition' },
    { n: 30, s: 'Zn', r: 4, c: 12, cat: 'transition' },
    { n: 31, s: 'Ga', r: 4, c: 13, cat: 'post-transition' },
    { n: 32, s: 'Ge', r: 4, c: 14, cat: 'metalloid' },
    { n: 33, s: 'As', r: 4, c: 15, cat: 'metalloid' },
    { n: 34, s: 'Se', r: 4, c: 16, cat: 'nonmetal' },
    { n: 35, s: 'Br', r: 4, c: 17, cat: 'halogen' },
    { n: 36, s: 'Kr', r: 4, c: 18, cat: 'noble-gas' },
    // Period 5
    { n: 37, s: 'Rb', r: 5, c: 1, cat: 'alkali' },
    { n: 38, s: 'Sr', r: 5, c: 2, cat: 'alkaline-earth' },
    { n: 39, s: 'Y', r: 5, c: 3, cat: 'transition' },
    { n: 40, s: 'Zr', r: 5, c: 4, cat: 'transition' },
    { n: 41, s: 'Nb', r: 5, c: 5, cat: 'transition' },
    { n: 42, s: 'Mo', r: 5, c: 6, cat: 'transition' },
    { n: 43, s: 'Tc', r: 5, c: 7, cat: 'transition' },
    { n: 44, s: 'Ru', r: 5, c: 8, cat: 'transition' },
    { n: 45, s: 'Rh', r: 5, c: 9, cat: 'transition' },
    { n: 46, s: 'Pd', r: 5, c: 10, cat: 'transition' },
    { n: 47, s: 'Ag', r: 5, c: 11, cat: 'transition' },
    { n: 48, s: 'Cd', r: 5, c: 12, cat: 'transition' },
    { n: 49, s: 'In', r: 5, c: 13, cat: 'post-transition' },
    { n: 50, s: 'Sn', r: 5, c: 14, cat: 'post-transition' },
    { n: 51, s: 'Sb', r: 5, c: 15, cat: 'metalloid' },
    { n: 52, s: 'Te', r: 5, c: 16, cat: 'metalloid' },
    { n: 53, s: 'I', r: 5, c: 17, cat: 'halogen' },
    { n: 54, s: 'Xe', r: 5, c: 18, cat: 'noble-gas' },
    // Period 6
    { n: 55, s: 'Cs', r: 6, c: 1, cat: 'alkali' },
    { n: 56, s: 'Ba', r: 6, c: 2, cat: 'alkaline-earth' },
    // 57-71 Lanthanides
    { n: 72, s: 'Hf', r: 6, c: 4, cat: 'transition' },
    { n: 73, s: 'Ta', r: 6, c: 5, cat: 'transition' },
    { n: 74, s: 'W', r: 6, c: 6, cat: 'transition' },
    { n: 75, s: 'Re', r: 6, c: 7, cat: 'transition' },
    { n: 76, s: 'Os', r: 6, c: 8, cat: 'transition' },
    { n: 77, s: 'Ir', r: 6, c: 9, cat: 'transition' },
    { n: 78, s: 'Pt', r: 6, c: 10, cat: 'transition' },
    { n: 79, s: 'Au', r: 6, c: 11, cat: 'transition' },
    { n: 80, s: 'Hg', r: 6, c: 12, cat: 'transition' },
    { n: 81, s: 'Tl', r: 6, c: 13, cat: 'post-transition' },
    { n: 82, s: 'Pb', r: 6, c: 14, cat: 'post-transition' },
    { n: 83, s: 'Bi', r: 6, c: 15, cat: 'post-transition' },
    { n: 84, s: 'Po', r: 6, c: 16, cat: 'post-transition' },
    { n: 85, s: 'At', r: 6, c: 17, cat: 'halogen' },
    { n: 86, s: 'Rn', r: 6, c: 18, cat: 'noble-gas' },
    // Period 7
    { n: 87, s: 'Fr', r: 7, c: 1, cat: 'alkali' },
    { n: 88, s: 'Ra', r: 7, c: 2, cat: 'alkaline-earth' },
    // 89-103 Actinides
    { n: 104, s: 'Rf', r: 7, c: 4, cat: 'transition' },
    { n: 105, s: 'Db', r: 7, c: 5, cat: 'transition' },
    { n: 106, s: 'Sg', r: 7, c: 6, cat: 'transition' },
    { n: 107, s: 'Bh', r: 7, c: 7, cat: 'transition' },
    { n: 108, s: 'Hs', r: 7, c: 8, cat: 'transition' },
    { n: 109, s: 'Mt', r: 7, c: 9, cat: 'unknown' },
    { n: 110, s: 'Ds', r: 7, c: 10, cat: 'unknown' },
    { n: 111, s: 'Rg', r: 7, c: 11, cat: 'unknown' },
    { n: 112, s: 'Cn', r: 7, c: 12, cat: 'transition' },
    { n: 113, s: 'Nh', r: 7, c: 13, cat: 'unknown' },
    { n: 114, s: 'Fl', r: 7, c: 14, cat: 'post-transition' },
    { n: 115, s: 'Mc', r: 7, c: 15, cat: 'unknown' },
    { n: 116, s: 'Lv', r: 7, c: 16, cat: 'unknown' },
    { n: 117, s: 'Ts', r: 7, c: 17, cat: 'unknown' },
    { n: 118, s: 'Og', r: 7, c: 18, cat: 'unknown' },
    // Lanthanides (Row 8, cols 3-17)
    { n: 57, s: 'La', r: 8, c: 3, cat: 'lanthanide' },
    { n: 58, s: 'Ce', r: 8, c: 4, cat: 'lanthanide' },
    { n: 59, s: 'Pr', r: 8, c: 5, cat: 'lanthanide' },
    { n: 60, s: 'Nd', r: 8, c: 6, cat: 'lanthanide' },
    { n: 61, s: 'Pm', r: 8, c: 7, cat: 'lanthanide' },
    { n: 62, s: 'Sm', r: 8, c: 8, cat: 'lanthanide' },
    { n: 63, s: 'Eu', r: 8, c: 9, cat: 'lanthanide' },
    { n: 64, s: 'Gd', r: 8, c: 10, cat: 'lanthanide' },
    { n: 65, s: 'Tb', r: 8, c: 11, cat: 'lanthanide' },
    { n: 66, s: 'Dy', r: 8, c: 12, cat: 'lanthanide' },
    { n: 67, s: 'Ho', r: 8, c: 13, cat: 'lanthanide' },
    { n: 68, s: 'Er', r: 8, c: 14, cat: 'lanthanide' },
    { n: 69, s: 'Tm', r: 8, c: 15, cat: 'lanthanide' },
    { n: 70, s: 'Yb', r: 8, c: 16, cat: 'lanthanide' },
    { n: 71, s: 'Lu', r: 8, c: 17, cat: 'lanthanide' },
    // Actinides (Row 9, cols 3-17)
    { n: 89, s: 'Ac', r: 9, c: 3, cat: 'actinide' },
    { n: 90, s: 'Th', r: 9, c: 4, cat: 'actinide' },
    { n: 91, s: 'Pa', r: 9, c: 5, cat: 'actinide' },
    { n: 92, s: 'U', r: 9, c: 6, cat: 'actinide' },
    { n: 93, s: 'Np', r: 9, c: 7, cat: 'actinide' },
    { n: 94, s: 'Pu', r: 9, c: 8, cat: 'actinide' },
    { n: 95, s: 'Am', r: 9, c: 9, cat: 'actinide' },
    { n: 96, s: 'Cm', r: 9, c: 10, cat: 'actinide' },
    { n: 97, s: 'Bk', r: 9, c: 11, cat: 'actinide' },
    { n: 98, s: 'Cf', r: 9, c: 12, cat: 'actinide' },
    { n: 99, s: 'Es', r: 9, c: 13, cat: 'actinide' },
    { n: 100, s: 'Fm', r: 9, c: 14, cat: 'actinide' },
    { n: 101, s: 'Md', r: 9, c: 15, cat: 'actinide' },
    { n: 102, s: 'No', r: 9, c: 16, cat: 'actinide' },
    { n: 103, s: 'Lr', r: 9, c: 17, cat: 'actinide' }
];

export class PeriodicTable {
    constructor(options = {}) {
        this.gridContainer = options.gridContainer || document.getElementById('periodic-grid');
        this.viewport = options.viewport || document.getElementById('pt-viewport') || document.querySelector('.pt-scroll-wrapper');
        this.canvas = options.canvas || document.getElementById('pt-canvas');
        this.zoomInBtn = options.zoomInBtn || document.getElementById('pt-zoom-in-btn');
        this.zoomOutBtn = options.zoomOutBtn || document.getElementById('pt-zoom-out-btn');
        this.zoomResetBtn = options.zoomResetBtn || document.getElementById('pt-zoom-reset-btn');
        this.zoomDisplay = options.zoomDisplay || document.getElementById('pt-zoom-display');

        this.inspectSymbol = options.inspectSymbol || document.getElementById('pt-inspect-symbol');
        this.inspectName = options.inspectName || document.getElementById('pt-inspect-name');
        this.inspectMeta = options.inspectMeta || document.getElementById('pt-inspect-meta');
        this.useBtn = options.useBtn || document.getElementById('pt-use-element-btn');
        this.searchInput = options.searchInput || document.getElementById('pt-search-input');
        this.clearBtn = options.clearBtn || document.getElementById('pt-search-clear');
        this.onSelectElement = options.onSelectElement || null;

        this.selectedElement = null;
        this.tileElements = [];

        // Pan & Zoom state
        this.scale = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.minScale = 0.35;
        this.maxScale = 3.5;
        this.isDragging = false;
        this.hasDragged = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.initialPanX = 0;
        this.initialPanY = 0;
        this.activePointers = new Map();
        this.pinchStartDist = null;
        this.pinchStartScale = 1.0;
        this.pinchMidpoint = { x: 0, y: 0 };

        this.init();
    }

    init() {
        if (!this.gridContainer) return;
        this.renderGrid();
        this.setupSearch();
        this.setupUseButton();
        this.setupPanAndZoom();

        // Default inspection to Carbon (#6)
        const carbon = PERIODIC_ELEMENTS.find(e => e.s === 'C');
        if (carbon) this.selectElement(carbon);

        // Fit full periodic table cleanly into narrow mobile viewports after layout
        requestAnimationFrame(() => this.resetZoom(false));
    }

    renderGrid() {
        this.gridContainer.innerHTML = '';
        this.tileElements = [];

        // 1. Lanthanide placeholder in Row 6, Col 3
        const laPlaceholder = document.createElement('div');
        laPlaceholder.className = 'pt-tile placeholder pt-lanthanide-placeholder';
        laPlaceholder.style.gridRow = '6';
        laPlaceholder.style.gridColumn = '3';
        laPlaceholder.innerHTML = `
            <span class="pt-num">57-71</span>
            <span class="pt-sym">La-Lu</span>
            <span class="pt-name">Lanthanoids</span>
        `;
        this.gridContainer.appendChild(laPlaceholder);

        // 2. Actinide placeholder in Row 7, Col 3
        const acPlaceholder = document.createElement('div');
        acPlaceholder.className = 'pt-tile placeholder pt-actinide-placeholder';
        acPlaceholder.style.gridRow = '7';
        acPlaceholder.style.gridColumn = '3';
        acPlaceholder.innerHTML = `
            <span class="pt-num">89-103</span>
            <span class="pt-sym">Ac-Lr</span>
            <span class="pt-name">Actinoids</span>
        `;
        this.gridContainer.appendChild(acPlaceholder);

        // 3. Render all 118 elements
        for (const elem of PERIODIC_ELEMENTS) {
            const data = elementData[elem.s] || { name: elem.s, number: elem.n };
            const elemName = data.name;

            const tile = document.createElement('button');
            tile.type = 'button';
            tile.className = `pt-tile cat-${elem.cat}`;
            tile.style.gridRow = String(elem.r);
            tile.style.gridColumn = String(elem.c);
            tile.dataset.symbol = elem.s;
            tile.dataset.name = elemName;
            tile.dataset.number = String(elem.n);
            tile.dataset.category = elem.cat;
            tile.title = `${elemName} [${elem.s}] • #${elem.n} (${CATEGORY_LABELS[elem.cat] || elem.cat})`;

            tile.innerHTML = `
                <span class="pt-num">${elem.n}</span>
                <span class="pt-sym">${elem.s}</span>
                <span class="pt-name">${elemName}</span>
            `;

            tile.addEventListener('click', (e) => {
                // If user dragged to pan, suppress click
                if (this.hasDragged) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                this.selectElement(elem, data);
            });

            tile.addEventListener('dblclick', (e) => {
                if (this.hasDragged) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                this.selectElement(elem, data);
                if (this.onSelectElement) {
                    this.onSelectElement({ symbol: elem.s, name: elemName, number: elem.n });
                }
            });

            this.gridContainer.appendChild(tile);
            this.tileElements.push({ elem, data, dom: tile });
        }
    }

    findElementBySymbol(symbol) {
        if (!symbol) return null;
        const symUpper = symbol.trim().toUpperCase();
        return PERIODIC_ELEMENTS.find(e => e.s.toUpperCase() === symUpper) || null;
    }

    selectElement(elem, data = null) {
        this.selectedElement = elem;
        const info = data || elementData[elem.s] || { name: elem.s, number: elem.n };

        // Highlight selected tile
        for (const item of this.tileElements) {
            item.dom.classList.toggle('selected', item.elem.s === elem.s);
        }

        if (this.inspectSymbol) this.inspectSymbol.textContent = elem.s;
        if (this.inspectName) this.inspectName.textContent = info.name;
        if (this.inspectMeta) {
            const catName = CATEGORY_LABELS[elem.cat] || elem.cat;
            this.inspectMeta.textContent = `Atomic #${elem.n} • ${catName}`;
        }
        if (this.useBtn) {
            this.useBtn.textContent = `➕ Place [${elem.s}] in Word`;
            this.useBtn.disabled = false;
        }
    }

    setupSearch() {
        if (!this.searchInput) return;

        const applyFilter = () => {
            const query = this.searchInput.value.trim().toLowerCase();
            if (this.clearBtn) {
                this.clearBtn.style.display = query ? 'block' : 'none';
            }

            if (!query) {
                for (const item of this.tileElements) {
                    item.dom.classList.remove('dimmed', 'highlighted');
                }
                return;
            }

            let firstMatch = null;
            for (const item of this.tileElements) {
                const s = item.elem.s.toLowerCase();
                const name = item.data.name.toLowerCase();
                const numStr = String(item.elem.n);
                const catStr = (CATEGORY_LABELS[item.elem.cat] || '').toLowerCase();

                const isMatch = s === query || name.includes(query) || numStr === query || catStr.includes(query);
                if (isMatch) {
                    item.dom.classList.remove('dimmed');
                    item.dom.classList.add('highlighted');
                    if (!firstMatch) firstMatch = item;
                } else {
                    item.dom.classList.remove('highlighted');
                    item.dom.classList.add('dimmed');
                }
            }

            if (firstMatch) {
                this.selectElement(firstMatch.elem, firstMatch.data);
                this.centerOnElement(firstMatch.elem);
            }
        };

        this.searchInput.addEventListener('input', applyFilter);

        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                this.searchInput.value = '';
                applyFilter();
                this.searchInput.focus();
            });
        }
    }

    setupUseButton() {
        if (!this.useBtn) return;
        this.useBtn.addEventListener('click', () => {
            if (!this.selectedElement) return;
            const info = elementData[this.selectedElement.s] || { name: this.selectedElement.s, number: this.selectedElement.n };
            if (this.onSelectElement) {
                this.onSelectElement({
                    symbol: this.selectedElement.s,
                    name: info.name,
                    number: this.selectedElement.n
                });
            }
        });
    }

    setupPanAndZoom() {
        if (!this.viewport || !this.canvas) return;

        // Button zoom controls
        if (this.zoomInBtn) {
            this.zoomInBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.zoomIn();
            });
        }
        if (this.zoomOutBtn) {
            this.zoomOutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.zoomOut();
            });
        }
        if (this.zoomResetBtn) {
            this.zoomResetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetZoom();
            });
        }

        // Mouse wheel zoom centered on cursor
        this.viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 0.87;
            this.zoomAt(this.scale * factor, e.clientX, e.clientY, false);
        }, { passive: false });

        // Pointer Events (unified Mouse & Touch pan + multi-touch pinch)
        this.viewport.addEventListener('pointerdown', (e) => {
            this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (this.activePointers.size === 1) {
                this.isDragging = true;
                this.hasDragged = false;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.initialPanX = this.panX;
                this.initialPanY = this.panY;
                this.viewport.classList.add('is-dragging');
                try {
                    this.viewport.setPointerCapture(e.pointerId);
                } catch (err) {}
            } else if (this.activePointers.size === 2) {
                this.isDragging = false;
                this.hasDragged = true;
                const pts = Array.from(this.activePointers.values());
                this.pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                this.pinchStartScale = this.scale;
                this.pinchMidpoint = {
                    x: (pts[0].x + pts[1].x) / 2,
                    y: (pts[0].y + pts[1].y) / 2
                };
            }
        });

        this.viewport.addEventListener('pointermove', (e) => {
            if (!this.activePointers.has(e.pointerId)) return;
            this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (this.activePointers.size === 2 && this.pinchStartDist) {
                const pts = Array.from(this.activePointers.values());
                const curDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                if (curDist > 10) {
                    const ratio = curDist / this.pinchStartDist;
                    const newScale = this.pinchStartScale * ratio;
                    this.zoomAt(newScale, this.pinchMidpoint.x, this.pinchMidpoint.y, false);
                }
            } else if (this.isDragging && this.activePointers.size === 1) {
                const dx = e.clientX - this.dragStartX;
                const dy = e.clientY - this.dragStartY;
                if (Math.hypot(dx, dy) > 5) {
                    this.hasDragged = true;
                }
                this.panX = this.initialPanX + dx;
                this.panY = this.initialPanY + dy;
                this.clampPan();
                this.applyTransform(false);
            }
        });

        const handlePointerEnd = (e) => {
            this.activePointers.delete(e.pointerId);
            try {
                this.viewport.releasePointerCapture(e.pointerId);
            } catch (err) {}

            if (this.activePointers.size === 0) {
                this.isDragging = false;
                this.viewport.classList.remove('is-dragging');
                this.pinchStartDist = null;
                setTimeout(() => {
                    this.hasDragged = false;
                }, 80);
            } else if (this.activePointers.size === 1) {
                const pt = this.activePointers.values().next().value;
                this.isDragging = true;
                this.dragStartX = pt.x;
                this.dragStartY = pt.y;
                this.initialPanX = this.panX;
                this.initialPanY = this.panY;
                this.pinchStartDist = null;
            }
        };

        this.viewport.addEventListener('pointerup', handlePointerEnd);
        this.viewport.addEventListener('pointercancel', handlePointerEnd);

        // Double click background to toggle between 100% and 1.8x zoom
        this.viewport.addEventListener('dblclick', (e) => {
            if (e.target.closest('.pt-tile')) return;
            if (this.scale > 1.1) {
                this.resetZoom();
            } else {
                this.zoomAt(1.8, e.clientX, e.clientY, true);
            }
        });

        window.addEventListener('resize', () => {
            const isMobile = window.innerWidth < 1000;
            if (isMobile) {
                const fit = this.getFitScale();
                if (this.scale <= fit * 1.1) {
                    this.resetZoom(false);
                    return;
                }
            } else if (this.viewport) {
                this.viewport.style.height = '';
            }
            this.clampPan();
            this.applyTransform(false);
        });

        this.applyTransform(false);
    }

    getFitScale() {
        if (!this.viewport || !this.gridContainer) return 1.0;
        if (window.innerWidth >= 1000) return 1.0;
        const vRect = this.viewport.getBoundingClientRect();
        const gridW = this.gridContainer.scrollWidth || 0;
        if (!vRect.width || !gridW || gridW <= vRect.width) return 1.0;
        const pad = 10;
        return Math.max(this.minScale, Math.min(1.0, (vRect.width - pad) / gridW));
    }

    zoomAt(targetScale, clientX, clientY, animate = true) {
        if (!this.viewport) return;
        const rect = this.viewport.getBoundingClientRect();
        const cx = (clientX !== undefined) ? (clientX - rect.left) : (rect.width / 2);
        const cy = (clientY !== undefined) ? (clientY - rect.top) : (rect.height / 2);

        const canvasX = (cx - this.panX) / this.scale;
        const canvasY = (cy - this.panY) / this.scale;

        const clampedScale = Math.min(this.maxScale, Math.max(this.minScale, targetScale));
        this.panX = cx - canvasX * clampedScale;
        this.panY = cy - canvasY * clampedScale;
        this.scale = clampedScale;

        this.clampPan();
        this.applyTransform(animate);
    }

    zoomIn() {
        this.zoomAt(this.scale * 1.25, undefined, undefined, true);
    }

    zoomOut() {
        this.zoomAt(this.scale / 1.25, undefined, undefined, true);
    }

    resetZoom(animate = true) {
        if (!this.viewport || !this.gridContainer) {
            this.scale = 1.0;
            this.panX = 0;
            this.panY = 0;
            this.applyTransform(animate);
            return;
        }
        const fit = this.getFitScale();
        this.scale = fit;
        const vRect = this.viewport.getBoundingClientRect();
        const scaledW = (this.gridContainer.scrollWidth || vRect.width) * this.scale;
        this.panX = Math.max(0, (vRect.width - scaledW) / 2);
        this.panY = 0;
        this.applyTransform(animate);
    }

    clampPan() {
        if (!this.viewport || !this.gridContainer) return;
        const vRect = this.viewport.getBoundingClientRect();
        const cWidth = (this.gridContainer.scrollWidth || vRect.width) * this.scale;
        const cHeight = (this.gridContainer.scrollHeight || vRect.height) * this.scale;

        const maxMarginX = Math.max(40, vRect.width * 0.35);
        const maxMarginY = Math.max(40, vRect.height * 0.35);

        const minX = vRect.width - cWidth - maxMarginX;
        const maxX = maxMarginX;
        const minY = vRect.height - cHeight - maxMarginY;
        const maxY = maxMarginY;

        this.panX = Math.max(minX, Math.min(maxX, this.panX));
        this.panY = Math.max(minY, Math.min(maxY, this.panY));
    }

    applyTransform(animate = false) {
        if (!this.canvas) return;
        this.canvas.style.transition = animate ? 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)' : 'none';
        this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;

        if (this.viewport && this.gridContainer) {
            if (window.innerWidth < 1000) {
                const gridH = this.gridContainer.scrollHeight || 0;
                if (gridH > 0) {
                    const targetH = Math.max(175, Math.min(340, Math.ceil(gridH * this.scale + 12)));
                    this.viewport.style.height = `${targetH}px`;
                }
            } else {
                this.viewport.style.height = '';
            }
        }

        if (this.zoomDisplay) {
            this.zoomDisplay.textContent = `${Math.round(this.scale * 100)}%`;
        }
    }

    centerOnElement(elem) {
        if (!this.viewport || !this.canvas) return;
        const targetTile = this.tileElements.find(item => item.elem.s === elem.s);
        if (!targetTile || !targetTile.dom) return;

        const vRect = this.viewport.getBoundingClientRect();
        const tRect = targetTile.dom.getBoundingClientRect();
        const currentScale = this.scale || 1.0;
        const tileCenterX = (tRect.left + tRect.width / 2) - vRect.left - this.panX;
        const tileCenterY = (tRect.top + tRect.height / 2) - vRect.top - this.panY;

        const targetScale = Math.max(this.scale, 1.4);
        const viewCenterX = vRect.width / 2;
        const viewCenterY = vRect.height / 2;

        this.scale = targetScale;
        this.panX = viewCenterX - (tileCenterX / currentScale) * targetScale;
        this.panY = viewCenterY - (tileCenterY / currentScale) * targetScale;
        this.clampPan();
        this.applyTransform(true);
    }
}

