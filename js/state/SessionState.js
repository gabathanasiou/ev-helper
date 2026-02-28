export class SessionState {
    constructor(id, initialState = null) {
        this.id = id;
        this.storageKey = `evSessionData_${id}`;

        // Base state structure
        this.state = {
            bookmarkedPokemon: [] // Array of { name, id, yields }
        };

        // Listeners for UI updates
        this.listeners = [];

        // Initialize from local storage or config
        this.loadState(initialState);
    }

    loadState(overrideState) {
        const saved = localStorage.getItem(this.storageKey);
        if (overrideState) {
            this.state = { ...this.state, ...overrideState };
        } else if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed.state };
            } catch (e) {
                console.warn('Failed to parse session state', e);
            }
        }
        this.notify();
    }

    saveState() {
        localStorage.setItem(this.storageKey, JSON.stringify({
            state: this.state
        }));
    }

    subscribe(listener) {
        this.listeners.push(listener);
        // Initial notify
        listener(this.state);

        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(l => l(this.state));
    }

    clearSession() {
        this.state = { bookmarkedPokemon: [] };
        localStorage.removeItem(this.storageKey);
        this.notify();
    }

    addBookmarkedPokemon(pokemonObject) {
        // Don't add duplicate
        if (this.state.bookmarkedPokemon.some(p => p.name === pokemonObject.name)) return;

        this.state.bookmarkedPokemon.push(pokemonObject);
        this.saveState();
        this.notify();
    }

    removeBookmarkedPokemon(pokemonName) {
        this.state.bookmarkedPokemon = this.state.bookmarkedPokemon.filter(p => p.name !== pokemonName);
        this.saveState();
        this.notify();
    }
}
