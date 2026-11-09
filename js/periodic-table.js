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
        this.inspectSymbol = options.inspectSymbol || document.getElementById('pt-inspect-symbol');
        this.inspectName = options.inspectName || document.getElementById('pt-inspect-name');
        this.inspectMeta = options.inspectMeta || document.getElementById('pt-inspect-meta');
        this.useBtn = options.useBtn || document.getElementById('pt-use-element-btn');
        this.searchInput = options.searchInput || document.getElementById('pt-search-input');
        this.clearBtn = options.clearBtn || document.getElementById('pt-search-clear');
        this.onSelectElement = options.onSelectElement || null;

        this.selectedElement = null;
        this.tileElements = [];

        this.init();
    }

    init() {
        if (!this.gridContainer) return;
        this.renderGrid();
        this.setupSearch();
        this.setupUseButton();

        // Default inspection to Carbon (#6)
        const carbon = PERIODIC_ELEMENTS.find(e => e.s === 'C');
        if (carbon) this.selectElement(carbon);
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

            tile.addEventListener('click', () => {
                this.selectElement(elem, data);
            });

            tile.addEventListener('dblclick', () => {
                this.selectElement(elem, data);
                if (this.onSelectElement) {
                    this.onSelectElement({ symbol: elem.s, name: elemName, number: elem.n });
                }
            });

            this.gridContainer.appendChild(tile);
            this.tileElements.push({ elem, data, dom: tile });
        }
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
}

