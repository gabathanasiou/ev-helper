import { pokeApi, GAME_VERSIONS } from './services/pokeApi.js';
import { SessionPane } from './components/SessionPane.js';

class App {
    constructor() {
        this.panes = new Map();
        this.nextPaneId = 1;
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingText = document.getElementById('loading-text');
        this.workspace = document.getElementById('workspace');
        this.btnAddPane = document.getElementById('btn-add-pane');

        this.globalZoom = 1;
        this.draggedPane = null;

        this.init();
    }

    async init() {
        console.log("App initializing...");
        this.initGameSelector();
        this.bindGlobalEvents();

        try {
            console.log("Fetching encounter data...");
            await pokeApi.fetchData();
            console.log("Data fetched successfully.");
            this.loadingOverlay.classList.remove('active');

            // Load saved panes or initialize with 1
            console.log("Restoring workspace...");
            this.restoreWorkspace();
            console.log("Workspace restored.");

        } catch (e) {
            console.error("Initialization error:", e);
            this.loadingText.textContent = "Failed to load data. Please refresh.";
            this.loadingText.style.color = "var(--danger)";
        }
    }

    initGameSelector() {

        const dropdownLabel = document.getElementById('game-dropdown-label');
        if (dropdownLabel) dropdownLabel.textContent = GAME_VERSIONS[pokeApi.gameId].label;
        document.title = `EV Helper - ${GAME_VERSIONS[pokeApi.gameId].label}`;

        // Remove old theme classes
        document.documentElement.className = '';
        document.documentElement.classList.add(GAME_VERSIONS[pokeApi.gameId].themeClass);

        const trigger = document.getElementById('game-dropdown-trigger');
        const triggerSvg = trigger?.querySelector('svg');
        const menu = document.getElementById('game-dropdown-menu');

        if (triggerSvg) {
            if (pokeApi.gameId === 'frlg') triggerSvg.style.color = '#ef4444';
            if (pokeApi.gameId === 'rs') triggerSvg.style.color = '#60a5fa';
            if (pokeApi.gameId === 'emerald') triggerSvg.style.color = '#10b981';
        }

        if (trigger && menu) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('active');
            });
            document.addEventListener('click', (e) => {
                if (!trigger.contains(e.target) && !menu.contains(e.target)) {
                    menu.classList.remove('active');
                }
            });
        }

        const btns = document.querySelectorAll('#game-dropdown-menu .game-btn');
        btns.forEach(btn => {
            if (btn.getAttribute('data-game') === pokeApi.gameId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            btn.addEventListener('click', () => {
                const newGameId = btn.getAttribute('data-game');
                if (newGameId !== pokeApi.gameId) {
                    pokeApi.setGameId(newGameId);
                    window.location.reload();
                }
            });
        });
    }

    bindGlobalEvents() {
        this.btnAddPane.addEventListener('click', () => {
            const pane = this.addPane();
            const isMobile = window.innerWidth <= 640;
            if (isMobile) {
                setTimeout(() => {
                    pane.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
            this.saveWorkspaceState();
        });

        this.workspace.addEventListener('closePane', (e) => {
            console.log("Workspace caught closePane event for ID:", e.detail.id);
            const paneId = e.detail.id;
            this.removePane(paneId);
            this.saveWorkspaceState();
        });

        this.workspace.addEventListener('openNewSession', (e) => {
            const { type, value } = e.detail;
            const triggeringPaneWrapper = e.target.closest('.pane-wrapper');
            const isMobile = window.innerWidth <= 640;
            const pane = this.addPane(null, triggeringPaneWrapper, isMobile);
            pane.triggerSearch(type, value);
            // On mobile scroll the new (top) pane into view with a slight delay for reliability
            if (isMobile) {
                setTimeout(() => {
                    pane.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
            }
            this.saveWorkspaceState();
        });

        // Global Zoom Controls
        const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        const btnZoomReset = document.getElementById('btn-zoom-reset');

        const updateZoom = () => {
            this.workspace.style.zoom = this.globalZoom;
            btnZoomReset.textContent = Math.round(this.globalZoom * 100) + '%';
        };

        if (btnZoomIn) btnZoomIn.addEventListener('click', () => {
            this.globalZoom = Math.min(this.globalZoom + 0.1, 1.5);
            updateZoom();
        });
        if (btnZoomOut) btnZoomOut.addEventListener('click', () => {
            this.globalZoom = Math.max(this.globalZoom - 0.1, 0.5);
            updateZoom();
        });
        if (btnZoomReset) btnZoomReset.addEventListener('click', () => {
            this.globalZoom = 1;
            updateZoom();
        });

        // Drag and drop sorting
        this.workspace.addEventListener('dragstart', (e) => {
            const wrapper = e.target.closest('.pane-wrapper');
            if (wrapper) {
                this.draggedPane = wrapper;
                setTimeout(() => wrapper.style.opacity = '0.5', 0);
            }
        });

        this.workspace.addEventListener('dragend', (e) => {
            if (this.draggedPane) {
                this.draggedPane.style.opacity = '1';
                this.draggedPane = null;
                this.saveWorkspaceState();
            }
        });

        this.workspace.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessary to allow dropping
            const afterElement = this.getDragAfterElement(this.workspace, e.clientX, e.clientY);
            const draggable = this.draggedPane;
            if (draggable) {
                if (afterElement == null) {
                    this.workspace.appendChild(draggable);
                } else {
                    this.workspace.insertBefore(draggable, afterElement);
                }
            }
        });
    }

    getDragAfterElement(container, x, y) {
        const draggableElements = [...container.querySelectorAll('.pane-wrapper:not([style*="opacity: 0.5"])')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            // Checking horizontal and vertical overlap depending on flex wrap
            const offsetX = x - box.left - box.width / 2;
            const offsetY = y - box.top - box.height / 2;

            // Basic proximity checking (euclidean-like)
            if (offsetX < 0 && offsetY < box.height / 2 && offsetY > -box.height / 2 && offsetX > closest.offset) {
                return { offset: offsetX, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    addPane(id = null, relativeTo = null, prepend = false) {
        const paneId = id || this.nextPaneId++;
        if (id && id >= this.nextPaneId) {
            this.nextPaneId = id + 1;
        }

        const paneWrapper = document.createElement('div');
        paneWrapper.className = 'pane-wrapper';
        paneWrapper.setAttribute('draggable', 'true');

        const pane = new SessionPane(paneWrapper, paneId);
        this.panes.set(paneId, pane);

        if (relativeTo && relativeTo.parentNode === this.workspace) {
            if (prepend) {
                relativeTo.before(paneWrapper); // insert before triggering pane (mobile: top)
            } else {
                relativeTo.after(paneWrapper);  // insert after triggering pane (desktop: side-by-side)
            }
        } else {
            this.workspace.appendChild(paneWrapper);
        }

        this.updateWorkspaceLayout();
        this.updateCloseButtons();
        return pane;
    }

    removePane(id) {
        // On mobile, always keep at least one pane open
        if (window.innerWidth <= 640 && this.panes.size <= 1) return;
        if (this.panes.has(id)) {
            const pane = this.panes.get(id);
            pane.destroy(); // Unsubscribes from state and removes HTML node
            this.panes.delete(id);
            // Also clean up local storage for that dead pane
            localStorage.removeItem(`evSessionData_${id}`);
            localStorage.removeItem(`evPaneHistory_${id}`);
            this.updateWorkspaceLayout();
            this.updateCloseButtons();
        }
    }

    updateWorkspaceLayout() {
        // Tiling is now handled by CSS flex-wrap: wrap
    }

    updateCloseButtons() {
        const canClose = this.panes.size > 1;
        this.workspace.querySelectorAll('.btn-close-pane').forEach(btn => {
            btn.disabled = !canClose;
            btn.style.opacity = canClose ? '1' : '0.2';
            btn.style.cursor = canClose ? 'pointer' : 'not-allowed';
            btn.title = canClose ? 'Close Panel' : 'Cannot close the last Research session';
        });
    }

    saveWorkspaceOrder() {
        // Rebuild paneIds order based on current DOM
        const newPaneIds = [];
        const wrappers = this.workspace.querySelectorAll('.pane-wrapper');
        wrappers.forEach(wrap => {
            for (let [id, pane] of this.panes.entries()) {
                if (pane.container === wrap) newPaneIds.push(id);
            }
        });
        try {
            localStorage.setItem(`evWorkspaceState_${pokeApi.gameId}`, JSON.stringify({ paneIds: newPaneIds, nextPaneId: this.nextPaneId }));
        } catch (e) {
            console.warn("Could not save workspace state due to storage quota.", e);
        }
    }

    saveWorkspaceState() {
        this.saveWorkspaceOrder();
    }

    restoreWorkspace() {
        const saved = localStorage.getItem(`evWorkspaceState_${pokeApi.gameId}`);
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (Array.isArray(state.paneIds)) {
                    this.nextPaneId = state.nextPaneId || 1;
                    state.paneIds.forEach(id => this.addPane(id));
                    return;
                }
            } catch (e) {
                console.warn("Failed to restore workspace", e);
            }
        }

        // Default to 1 pane if no state exists
        this.addPane(1);
    }
}

// Boot application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Event Listeners for EV Modal
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('ev-modal');
    const openBtn = document.getElementById('btn-what-are-evs');
    const closeBtn = document.getElementById('btn-close-modal');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    // Close when clicking outside of modal content
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
});
