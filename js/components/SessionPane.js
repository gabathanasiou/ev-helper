import { pokeApi, GAME_VERSIONS } from '../services/pokeApi.js';
import { SessionState } from '../state/SessionState.js';
import { setupAutocomplete } from './autocomplete.js';
import { formatName, getYieldPillHtml, escapeHTML, getSpriteUrl, getIconUrl } from '../utils/helpers.js';

export class SessionPane {
    constructor(containerElement, id) {
        this.container = containerElement;
        this.id = id;
        this.state = new SessionState(id);
        this.activeSearches = new Set();
        this.searchHistory = [];

        // Inject dynamic styles if they don't exist
        if (!document.getElementById('session-pane-styles')) {
            const style = document.createElement('style');
            style.id = 'session-pane-styles';
            style.textContent = `
                .research-link {
                    cursor: pointer;
                    color: var(--text-color, #ffffff);
                    text-decoration: none;
                    border-bottom: 2px dotted var(--primary);
                    transition: color 0.2s, opacity 0.2s, background-color 0.2s;
                }
                .research-link:hover {
                    color: var(--primary);
                    opacity: 0.8;
                }
                .location-tag.research-link {
                    border-bottom: none;
                }
                .location-tag.research-link:hover {
                    background-color: var(--panel-border);
                    color: var(--text-color, #ffffff);
                }
                .btn-icon-zoom {
                    font-size: 1.2rem;
                    line-height: 1;
                }
            `;
            document.head.appendChild(style);
        }

        this.renderSkeleton();
        this.bindEvents();

        // Subscribe to state changes to update the session UI
        this.unsubscribe = this.state.subscribe((state) => {
            this.renderSession(state);
        });
    }

    // Generate the HTML for one panel
    renderSkeleton() {
        this.container.classList.add('pane');
        const paneHtml = `
      <div class="pane-header" draggable="true" style="cursor: grab;">
        <h2 class="pane-title">Research <span>#${this.id}</span></h2>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-icon btn-clear-session" title="Clear Search Results" aria-label="Clear">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
          <button class="btn btn-icon btn-close-pane" title="Close Panel" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>


      <nav class="tabs">
        <button class="tab-btn active" data-tab="search-stat-${this.id}">By Stat</button>
        <button class="tab-btn" data-tab="search-route-${this.id}">By Route</button>
        <button class="tab-btn" data-tab="search-pokemon-${this.id}">By Pokémon</button>
        <button class="tab-btn" data-tab="search-method-${this.id}">By Method</button>
      </nav>

      <div class="tab-content-container">
        <!-- BY STAT -->
        <section id="search-stat-${this.id}" class="tab-pane active">
          <div class="glass-panel search-panel">
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                 <label style="margin: 0; font-weight: 600;">Search by EV Stat:</label>
                 <div class="stat-toggle-group" style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 4px; display: none; align-items: center; gap: 4px; border: 1px solid rgba(255,255,255,0.05); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
                     <button class="btn btn-small stat-view-btn active" data-mode="pokemon" style="border: none; background: rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 6px 14px; font-weight: 600; font-size: 0.8rem; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: all 0.2s ease;">Group by Pokémon</button>
                     <button class="btn btn-small stat-view-btn" data-mode="routes" style="border: none; background: transparent; color: rgba(255,255,255,0.6); border-radius: 6px; padding: 6px 14px; font-weight: 600; font-size: 0.8rem; transition: all 0.2s ease;">Group by Route</button>
                 </div>
             </div>
             <div style="display: flex; flex-wrap: wrap; gap: 8px;">
               <button class="btn btn-small btn-outline btn-stat" data-stat="hp">HP</button>
               <button class="btn btn-small btn-outline btn-stat" data-stat="attack">Attack</button>
               <button class="btn btn-small btn-outline btn-stat" data-stat="defense">Defense</button>
               <button class="btn btn-small btn-outline btn-stat" data-stat="special-attack">Sp. Attack</button>
               <button class="btn btn-small btn-outline btn-stat" data-stat="special-defense">Sp. Defense</button>
               <button class="btn btn-small btn-outline btn-stat" data-stat="speed">Speed</button>
             </div>
          </div>
          <div class="results-container stat-results"></div>
        </section>

        <!-- BY ROUTE -->
        <section id="search-route-${this.id}" class="tab-pane">
          <div class="glass-panel search-panel">
             <label>Search Location / Route:</label>
             <div class="autocomplete-wrapper">
                <input type="text" class="custom-input route-search" 
                       placeholder="e.g. Route 1..." 
                       autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                <div class="autocomplete-list route-list"></div>
             </div>
          </div>
          <div class="results-container route-results"></div>
        </section>

        <!-- BY POKEMON -->
        <section id="search-pokemon-${this.id}" class="tab-pane">
          <div class="glass-panel search-panel">
             <label>Search Pokémon:</label>
             <div class="autocomplete-wrapper">
                <input type="text" class="custom-input pokemon-search" 
                       placeholder="e.g. Pidgey..." 
                       autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                <div class="autocomplete-list pokemon-list"></div>
             </div>
          </div>
          <div class="results-container pokemon-results"></div>
        </section>

        <!-- BY METHOD -->
        <section id="search-method-${this.id}" class="tab-pane">
          <div class="glass-panel search-panel">
             <label>Search Method (e.g. Surf, Old Rod):</label>
             <div class="autocomplete-wrapper">
                <input type="text" class="custom-input method-search" 
                       placeholder="e.g. Surf..." 
                       autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                <div class="autocomplete-list method-list"></div>
             </div>
          </div>
          <div class="results-container method-results"></div>
        </section>
      </div>
    `;
        this.container.innerHTML = paneHtml;

        this.statViewMode = 'pokemon';

        // Grab elements we need to reference
        this.statResultsContainer = this.container.querySelector('.stat-results');
        this.routeResultsContainer = this.container.querySelector('.route-results');
        this.pokemonResultsContainer = this.container.querySelector('.pokemon-results');
        this.methodResultsContainer = this.container.querySelector('.method-results');

    }

    bindEvents() {
        // Tabs
        const tabs = this.container.querySelectorAll('.tab-btn');
        const panes = this.container.querySelectorAll('.tab-pane');
        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const targetId = btn.getAttribute('data-tab');
                this.container.querySelector(`#${targetId}`).classList.add('active');
            });
        });

        // Close Pane (emits event to parent)
        const btnClose = this.container.querySelector('.btn-close-pane');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                console.log("Closing pane button clicked for id: " + this.id);
                const evt = new CustomEvent('closePane', {
                    detail: { id: this.id },
                    bubbles: true,
                    composed: true
                });
                this.container.dispatchEvent(evt);
            });
        }

        // Stat Search
        this.container.querySelectorAll('.btn-stat').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentStat = btn.getAttribute('data-stat');

                // Show toggle controls
                this.container.querySelector('.stat-toggle-group').style.display = 'inline-flex';

                this.renderStatResults(this.currentStat);
            });
        });

        // Toggle UI logic
        this.container.querySelectorAll('.stat-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.currentStat) return;

                this.container.querySelectorAll('.stat-view-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'transparent';
                    b.style.color = 'rgba(255,255,255,0.6)';
                    b.style.boxShadow = 'none';
                });
                btn.classList.add('active');
                btn.style.background = 'rgba(255,255,255,0.15)';
                btn.style.color = '#fff';
                btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';

                this.statViewMode = btn.getAttribute('data-mode');
                this.renderStatResults(this.currentStat);
            });
        });

        // Session controls
        this.container.querySelector('.btn-clear-session').addEventListener('click', () => {
            this.statResultsContainer.innerHTML = '';
            this.routeResultsContainer.innerHTML = '';
            this.pokemonResultsContainer.innerHTML = '';
            this.methodResultsContainer.innerHTML = '';
            this.activeSearches.clear();
            this.updateSessionTitle();
            this.searchHistory = [];
            this.saveHistory();
        });

        // Because pokeApi fetches data asynchronously, we wait for it to be ready
        // before initializing autocomplete.
        if (pokeApi.data) {
            this.initAutocomplete();
            this.restoreHistory();
        } else {
            // A poor man's polling just for edge cases where data isn't ready when we clone a pane
            const wait = setInterval(() => {
                if (pokeApi.data) {
                    clearInterval(wait);
                    this.initAutocomplete();
                    this.restoreHistory();
                }
            }, 500);
        }
    }

    triggerSearch(type, value) {
        const tabs = this.container.querySelectorAll('.tab-btn');
        const panes = this.container.querySelectorAll('.tab-pane');
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        if (type === 'stat') {
            this.container.querySelector(`[data-tab="search-stat-${this.id}"]`).classList.add('active');
            this.container.querySelector(`#search-stat-${this.id}`).classList.add('active');
            this.renderStatResults(value);
        } else if (type === 'route') {
            this.container.querySelector(`[data-tab="search-route-${this.id}"]`).classList.add('active');
            this.container.querySelector(`#search-route-${this.id}`).classList.add('active');
            this.renderRouteResults(value);
        } else if (type === 'pokemon') {
            this.container.querySelector(`[data-tab="search-pokemon-${this.id}"]`).classList.add('active');
            this.container.querySelector(`#search-pokemon-${this.id}`).classList.add('active');
            this.renderPokemonResults(value);
        } else if (type === 'method') {
            this.container.querySelector(`[data-tab="search-method-${this.id}"]`).classList.add('active');
            this.container.querySelector(`#search-method-${this.id}`).classList.add('active');
            this.renderMethodResults(value);
        }
    }

    initAutocomplete() {
        setupAutocomplete(
            this.container.querySelector('.route-search'),
            this.container.querySelector('.route-list'),
            pokeApi.data.locations,
            (val) => this.renderRouteResults(val)
        );
        setupAutocomplete(
            this.container.querySelector('.pokemon-search'),
            this.container.querySelector('.pokemon-list'),
            pokeApi.data.pokemonList,
            (val) => {
                this.renderPokemonResults(val);
                this.container.querySelector('.pokemon-search').value = '';
            }
        );

        // Extract unique methods
        const uniqueMethods = Array.from(new Set(pokeApi.data.encounters.map(e => e.method))).sort();
        setupAutocomplete(
            this.container.querySelector('.method-search'),
            this.container.querySelector('.method-list'),
            uniqueMethods,
            (val) => this.renderMethodResults(val)
        );
    }

    renderSession(state) {
        // Research board removed
    }

    getRarityStr(pokemonName, locationName) {
        const sums = {};
        const config = GAME_VERSIONS[pokeApi.gameId];
        config.versions.forEach(v => sums[v] = 0);

        pokeApi.data.encounters.forEach(e => {
            if (e.pokemon === pokemonName && e.location === locationName) {
                if (sums[e.version] !== undefined) sums[e.version] += e.rarity;
            }
        });

        // Cap at 100% logically to avoid confusion over multiple slots for identical pokemon
        config.versions.forEach(v => sums[v] = Math.min(100, sums[v]));

        const vals = Object.values(sums);
        const maxVal = Math.max(...vals);
        if (maxVal === 0) return '';

        // If differing rarities between versions within same game pair
        const uniqueVals = new Set(vals);
        if (uniqueVals.size > 1 && config.versions.length > 1) {
            const parts = config.versions.map(v => {
                const shortName = v === 'firered' ? 'FR' : v === 'leafgreen' ? 'LG' : v === 'ruby' ? 'R' : v === 'sapphire' ? 'S' : 'E';
                return sums[v] > 0 ? `${shortName}: ${sums[v]}%` : null;
            }).filter(Boolean);
            return `(${parts.join(', ')})`;
        }

        return `(${maxVal}%)`;
    }

    getMaxRarity(pokemonName, locationName) {
        const sums = {};
        const config = GAME_VERSIONS[pokeApi.gameId];
        config.versions.forEach(v => sums[v] = 0);
        pokeApi.data.encounters.forEach(e => {
            if (e.pokemon === pokemonName && e.location === locationName) {
                if (sums[e.version] !== undefined) sums[e.version] += e.rarity;
            }
        });
        const maxVal = Math.max(0, ...Object.values(sums));
        return Math.min(100, maxVal);
    }

    saveHistory() {
        try {
            localStorage.setItem(`evPaneHistory_${this.id}`, JSON.stringify(this.searchHistory));
        } catch (e) {
            console.warn("Could not save session history due to storage quota.", e);
        }
    }

    restoreHistory() {
        const saved = localStorage.getItem(`evPaneHistory_${this.id}`);
        if (saved) {
            try {
                const list = JSON.parse(saved);
                if (list && list.length > 0) {
                    [...list].reverse().forEach(item => {
                        this.triggerSearch(item.type, item.value);
                    });
                }
            } catch (e) {
                console.error("Failed to restore pane history", e);
            }
        }
    }

    dispatchNewSession(type, value) {
        const evt = new CustomEvent('openNewSession', {
            detail: { type, value },
            bubbles: true,
            composed: true
        });
        this.container.dispatchEvent(evt);
    }

    updateSessionTitle() {
        const titleEl = this.container.querySelector('.pane-header h2');
        if (this.activeSearches.size === 0) {
            titleEl.innerHTML = `Research <span>#${this.id}</span>`;
            return;
        }
        const terms = Array.from(this.activeSearches);
        if (terms.length > 2) {
            titleEl.innerHTML = `Research: ${escapeHTML(terms[0])}, ${escapeHTML(terms[1])} & ${terms.length - 2} more`;
        } else {
            titleEl.innerHTML = `Research: ${terms.map(escapeHTML).join(', ')}`;
        }
    }

    // --- Rendering Results Logic ---

    renderStatResults(stat) {
        this.activeSearches.clear();
        this.activeSearches.add(formatName(stat) + ' Yields');
        this.updateSessionTitle();

        this.searchHistory = [{ type: 'stat', value: stat }];
        this.saveHistory();

        this.statResultsContainer.innerHTML = '';
        this.currentStat = stat;

        // Highlight active stat button
        this.container.querySelectorAll('.btn-stat').forEach(btn => {
            if (btn.getAttribute('data-stat') === stat) {
                btn.classList.add('active');
                btn.style.background = 'var(--primary)';
                btn.style.borderColor = 'var(--primary)';
            } else {
                btn.classList.remove('active');
                btn.style.background = 'transparent';
                btn.style.borderColor = '';
            }
        });

        // Ensure toggle is visible if a stat is passed but button wasn't clicked (e.g. history load)
        const statToggleGrp = this.container.querySelector('.stat-toggle-group');
        if (statToggleGrp) statToggleGrp.style.display = 'inline-flex';

        if (this.statViewMode === 'routes') {
            const locationsWithStat = {};
            pokeApi.data.encounters.forEach(enc => {
                const yieldsStat = enc.yields.find(y => y.stat === stat);
                if (yieldsStat) {
                    if (!locationsWithStat[enc.location]) {
                        locationsWithStat[enc.location] = { name: enc.location, pokemonMap: new Map() };
                    }
                    const pKey = enc.pokemon;
                    if (!locationsWithStat[enc.location].pokemonMap.has(pKey)) {
                        locationsWithStat[enc.location].pokemonMap.set(pKey, enc.yields);
                    }
                }
            });

            const sortedLocations = Object.values(locationsWithStat)
                .sort((a, b) => b.pokemonMap.size - a.pokemonMap.size || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

            if (sortedLocations.length === 0) {
                this.statResultsContainer.innerHTML += `<div class="result-card"><p>No routes found for this stat.</p></div>`;
                return;
            }

            sortedLocations.forEach(loc => {
                const card = document.createElement('div');
                card.className = 'result-card';

                let pkmHtml = '';

                // Sort pokemon by max rarity within this location
                const sortedPokemon = Array.from(loc.pokemonMap.entries()).sort((a, b) => {
                    return this.getMaxRarity(b[0], loc.name) - this.getMaxRarity(a[0], loc.name);
                });

                sortedPokemon.forEach((entry) => {
                    const pkmName = entry[0];
                    const yields = entry[1];
                    const pkmObj = pokeApi.data.pokemonListArray.find(p => p.name === pkmName);
                    const iconHtml = pkmObj ? `<img src="${getIconUrl(pkmObj.id)}" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pkmObj.id}.png'" style="width: 64px; height: 64px; object-fit: contain; image-rendering: pixelated; margin-right: 8px;">` : '';
                    const rarityStr = this.getRarityStr(pkmName, loc.name);

                    pkmHtml += `<div class="pokemon-entry">
                <div style="display: flex; align-items: center;">${iconHtml}<span class="clickable-pkm research-link" data-pkm="${escapeHTML(pkmName)}">${escapeHTML(pkmName)}</span><span class="text-muted" style="font-size: 0.8rem; margin-left: 4px;">${rarityStr}</span></div>
                <div>${getYieldPillHtml(yields)}</div>
             </div>`;
                });

                card.innerHTML = `
            <h3 class="clickable-loc research-link" data-loc="${escapeHTML(loc.name)}" style="margin-bottom: 4px; display: inline-block;">${escapeHTML(loc.name)}</h3>
            <p class="text-muted" style="margin-bottom: 12px; font-size: 0.8rem;">Good for training ${formatName(stat)}</p>
            <div>${pkmHtml}</div>
          `;

                card.querySelectorAll('.clickable-pkm').forEach(el => {
                    el.addEventListener('click', () => this.dispatchNewSession('pokemon', el.getAttribute('data-pkm')));
                });
                card.querySelectorAll('.clickable-loc').forEach(el => {
                    el.addEventListener('click', () => this.dispatchNewSession('route', el.getAttribute('data-loc')));
                });
                card.querySelectorAll('.clickable-stat').forEach(el => {
                    el.addEventListener('click', () => this.dispatchNewSession('stat', el.getAttribute('data-stat')));
                });
                card.querySelectorAll('.clickable-method').forEach(el => {
                    el.addEventListener('click', () => this.dispatchNewSession('method', el.getAttribute('data-method')));
                });

                this.statResultsContainer.appendChild(card);
            });
        } else {
            // POKEMON MODE
            const pkmsWithStat = new Map();
            pokeApi.data.encounters.forEach(enc => {
                const yieldsStat = enc.yields.find(y => y.stat === stat);
                if (yieldsStat) {
                    if (!pkmsWithStat.has(enc.pokemon)) {
                        pkmsWithStat.set(enc.pokemon, { yields: enc.yields, locations: new Set(), id: enc.id });
                    }
                    pkmsWithStat.get(enc.pokemon).locations.add(enc.location);
                }
            });

            const sortedPokemon = Array.from(pkmsWithStat.entries())
                .sort((a, b) => a[1].id - b[1].id);

            if (sortedPokemon.length === 0) {
                this.statResultsContainer.innerHTML += `<div class="result-card"><p>No Pokémon found yielding this stat.</p></div>`;
                return;
            }

            sortedPokemon.forEach(([pkmName, data]) => {
                const pkmObj = pokeApi.data.pokemonListArray.find(p => p.name === pkmName);
                const spriteVersion = GAME_VERSIONS[pokeApi.gameId].spriteVersionGroup;
                const spriteHtml = pkmObj ? `<img src="${getSpriteUrl(pkmObj.id, spriteVersion)}" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pkmObj.id}.png'" style="width: 80px; height: 80px; object-fit: contain; image-rendering: pixelated;">` : '';

                const locationsArray = Array.from(data.locations).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                const card = document.createElement('div');
                card.className = 'result-card';
                card.setAttribute('data-pokemon', pkmName);

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${spriteHtml}
                            <div>
                                <h3 class="clickable-pkm research-link" data-pkm="${escapeHTML(pkmName)}" style="margin-bottom: 4px; display: inline-block;">${escapeHTML(pkmName)}</h3>
                                <div>${getYieldPillHtml(data.yields)}</div>
                            </div>
                        </div>
                    </div>
                    <div style="background: rgba(0,0,0,0.15); border-radius: 8px; padding: 8px;">
                        <h4 class="text-muted" style="margin-bottom: 6px; font-size: 0.85rem;">Locations</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                            ${locationsArray.map(loc => `<span class="location-tag clickable-loc research-link" data-loc="${escapeHTML(loc)}" style="font-size: 0.8rem; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px;">${escapeHTML(loc)}</span>`).join('')}
                        </div>
                    </div>
                `;

                card.querySelectorAll('.clickable-loc').forEach(el => {
                    el.addEventListener('click', () => this.dispatchNewSession('route', el.getAttribute('data-loc')));
                });
                card.querySelectorAll('.clickable-pkm').forEach(el => {
                    el.addEventListener('click', () => this.dispatchNewSession('pokemon', el.getAttribute('data-pkm')));
                });
                card.querySelectorAll('.clickable-stat').forEach(el => {
                    el.addEventListener('click', () => this.dispatchNewSession('stat', el.getAttribute('data-stat')));
                });

                this.statResultsContainer.appendChild(card);
            });
        }
    }

    renderMethodResults(methodName) {
        // Prevent duplicates early
        const existingCard = this.methodResultsContainer.querySelector(`[data-method="${escapeHTML(methodName)}"]`);
        if (existingCard) {
            existingCard.remove();
        }

        this.activeSearches.add(formatName(methodName));
        this.updateSessionTitle();

        this.searchHistory = this.searchHistory.filter(h => !(h.type === 'method' && h.value === methodName));
        this.searchHistory.unshift({ type: 'method', value: methodName });
        this.saveHistory();

        // Clear empty state message if it is there
        const firstChild = this.methodResultsContainer.firstElementChild;
        if (firstChild && firstChild.innerHTML.includes('No encounters found.')) {
            this.methodResultsContainer.innerHTML = '';
        }

        const encountersInMethod = pokeApi.data.encounters.filter(e => e.method === methodName);

        if (encountersInMethod.length === 0) {
            if (this.methodResultsContainer.children.length === 0) {
                this.methodResultsContainer.innerHTML = `<div class="result-card"><p>No encounters found for this method.</p></div>`;
            }
            return;
        }

        const card = document.createElement('div');
        card.className = 'result-card';
        card.setAttribute('data-method', methodName);

        card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <h3 style="margin-bottom: 12px; display: inline-block;">${escapeHTML(methodName)} Encounters</h3>
        <button class="btn btn-icon btn-remove-card">×</button>
      </div>
    `;

        let methodHtml = '';

        // Group by location
        const locationsMap = new Map();
        encountersInMethod.forEach(enc => {
            if (!locationsMap.has(enc.location)) {
                locationsMap.set(enc.location, new Map());
            }
            if (!locationsMap.get(enc.location).has(enc.pokemon)) {
                locationsMap.get(enc.location).set(enc.pokemon, enc.yields);
            }
        });

        const sortedLocations = Array.from(locationsMap.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }));

        sortedLocations.forEach(([locName, pokemonMap]) => {
            methodHtml += `<div style="margin-bottom: 16px;">
                <h4 class="clickable-loc research-link" data-loc="${escapeHTML(locName)}" style="margin-bottom: 8px; font-size: 0.95rem;">${escapeHTML(locName)}</h4>
                <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 8px; border-left: 2px solid rgba(255,255,255,0.1);">`;

            const sortedPokemon = Array.from(pokemonMap.entries()).sort((a, b) => this.getMaxRarity(b[0], locName) - this.getMaxRarity(a[0], locName));

            sortedPokemon.forEach(([pkmName, yields]) => {
                const pkmObj = pokeApi.data.pokemonListArray.find(p => p.name === pkmName);
                const iconHtml = pkmObj ? `<img src="${getIconUrl(pkmObj.id)}" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pkmObj.id}.png'" style="width: 48px; height: 48px; object-fit: contain; image-rendering: pixelated; margin-right: 8px;">` : '';
                const rarityStr = this.getRarityStr(pkmName, locName);

                methodHtml += `<div class="pokemon-entry" style="padding: 4px; border: none; background: transparent;">
                    <div style="display: flex; align-items: center;">${iconHtml}<span class="clickable-pkm research-link" data-pkm="${escapeHTML(pkmName)}"><strong>${escapeHTML(pkmName)}</strong></span> <span class="text-muted" style="margin-left: 4px; font-size: 0.8rem;">${rarityStr}</span></div>
                    <div>${getYieldPillHtml(yields)}</div>
                </div>`;
            });
            methodHtml += `</div></div>`;
        });

        card.innerHTML += methodHtml;

        card.querySelector('.btn-remove-card').addEventListener('click', () => {
            card.remove();
            this.activeSearches.delete(formatName(methodName));
            this.updateSessionTitle();
            this.searchHistory = this.searchHistory.filter(h => !(h.type === 'method' && h.value === methodName));
            this.saveHistory();
        });

        card.querySelectorAll('.clickable-loc').forEach(el => {
            el.addEventListener('click', () => this.dispatchNewSession('route', el.getAttribute('data-loc')));
        });
        card.querySelectorAll('.clickable-pkm').forEach(el => {
            el.addEventListener('click', () => this.dispatchNewSession('pokemon', el.getAttribute('data-pkm')));
        });
        card.querySelectorAll('.clickable-stat').forEach(el => {
            el.addEventListener('click', () => this.dispatchNewSession('stat', el.getAttribute('data-stat')));
        });

        this.methodResultsContainer.insertBefore(card, this.methodResultsContainer.firstChild);
    }

    renderRouteResults(routeName) {
        // Prevent duplicates early
        const existingCard = this.routeResultsContainer.querySelector(`[data-route="${escapeHTML(routeName)}"]`);
        if (existingCard) {
            existingCard.remove();
        }

        this.activeSearches.add(routeName);
        this.updateSessionTitle();

        this.searchHistory = this.searchHistory.filter(h => !(h.type === 'route' && h.value === routeName));
        this.searchHistory.unshift({ type: 'route', value: routeName });
        this.saveHistory();

        // Clear empty state message if it is there
        const firstChild = this.routeResultsContainer.firstElementChild;
        if (firstChild && firstChild.innerHTML.includes('No encounters found.')) {
            this.routeResultsContainer.innerHTML = '';
        }

        // Prevent duplicates (already did early, but keeping structure intact)

        const encountersInRoute = pokeApi.data.encounters.filter(e => e.location === routeName);

        if (encountersInRoute.length === 0) {
            // Only add 'no data' if empty
            if (this.routeResultsContainer.children.length === 0) {
                this.routeResultsContainer.innerHTML = `<div class="result-card"><p>No encounters found.</p></div>`;
            }
            return;
        }

        const uniquePokemon = new Map();
        encountersInRoute.forEach(enc => {
            if (!uniquePokemon.has(enc.pokemon)) uniquePokemon.set(enc.pokemon, enc.yields);
        });

        const card = document.createElement('div');
        card.className = 'result-card';
        card.setAttribute('data-route', routeName);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
               <h3 style="margin-bottom: 12px;">Yields in ${escapeHTML(routeName)}</h3>
               <button class="btn btn-icon btn-remove-card">×</button>
            </div>
        `;

        let pkmHtml = '';

        // Sort pokemon by max rarity within this location
        const sortedPokemon = Array.from(uniquePokemon.entries()).sort((a, b) => {
            return this.getMaxRarity(b[0], routeName) - this.getMaxRarity(a[0], routeName);
        });

        sortedPokemon.forEach((entry) => {
            const pkmName = entry[0];
            const yields = entry[1];
            const pkmObj = pokeApi.data.pokemonListArray.find(p => p.name === pkmName);
            const iconHtml = pkmObj ? `<img src="${getIconUrl(pkmObj.id)}" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pkmObj.id}.png'" style="width: 64px; height: 64px; object-fit: contain; image-rendering: pixelated; margin-right: 8px;">` : '';
            const rarityStr = this.getRarityStr(pkmName, routeName);
            const methodsForPkm = Array.from(new Set(encountersInRoute.filter(e => e.pokemon === pkmName).map(e => e.method))).sort();

            pkmHtml += `<div class="pokemon-entry" style="align-items: center;">
          <div style="display: flex; align-items: center;">${iconHtml}
             <div style="display: flex; flex-direction: column;">
                <div>
                   <span class="clickable-pkm research-link" data-pkm="${escapeHTML(pkmName)}"><strong>${escapeHTML(pkmName)}</strong></span>
                   <span class="text-muted" style="font-size: 0.8rem; margin-left: 4px; font-weight: normal;">${rarityStr}</span>
                </div>
                <div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">
                   ${methodsForPkm.map(m => `<span class="location-tag method-tag clickable-method research-link" data-method="${escapeHTML(m)}" style="font-size: 0.7rem; background: rgba(255,255,255,0.05); padding: 1px 6px; border-radius: 4px;">${escapeHTML(m)}</span>`).join('')}
                </div>
             </div>
          </div>
          <div>${getYieldPillHtml(yields)}</div>
       </div>`;
        });

        card.innerHTML += `<div>${pkmHtml}</div>`;

        card.querySelector('.btn-remove-card').addEventListener('click', () => {
            card.remove();
            this.activeSearches.delete(routeName);
            this.updateSessionTitle();
            this.searchHistory = this.searchHistory.filter(h => !(h.type === 'route' && h.value === routeName));
            this.saveHistory();
        });
        card.querySelectorAll('.clickable-pkm').forEach(el => {
            el.addEventListener('click', () => this.dispatchNewSession('pokemon', el.getAttribute('data-pkm')));
        });
        card.querySelectorAll('.clickable-stat').forEach(el => {
            el.addEventListener('click', () => this.dispatchNewSession('stat', el.getAttribute('data-stat')));
        });
        card.querySelectorAll('.clickable-method').forEach(el => {
            el.addEventListener('click', () => this.dispatchNewSession('method', el.getAttribute('data-method')));
        });

        this.routeResultsContainer.insertBefore(card, this.routeResultsContainer.firstChild);
    }

    renderPokemonResults(pokemonName) {
        // Prevent duplicates
        const existingCard = this.pokemonResultsContainer.querySelector(`[data-pokemon="${escapeHTML(pokemonName)}"]`);
        if (existingCard) {
            existingCard.remove();
        }

        this.activeSearches.add(pokemonName);
        this.updateSessionTitle();

        this.searchHistory = this.searchHistory.filter(h => !(h.type === 'pokemon' && h.value === pokemonName));
        this.searchHistory.unshift({ type: 'pokemon', value: pokemonName });
        this.saveHistory();

        // Clear empty state message if it is there
        const firstChild = this.pokemonResultsContainer.firstElementChild;
        if (firstChild && firstChild.innerHTML.includes('No data found.')) {
            this.pokemonResultsContainer.innerHTML = '';
        }

        // Prevent duplicates already handled

        const pkmObj = pokeApi.data.pokemonListArray.find(p => p.name === pokemonName);
        if (!pkmObj) {
            if (this.pokemonResultsContainer.children.length === 0) {
                this.pokemonResultsContainer.innerHTML = `<div class="result-card"><p>Pokémon data not found.</p></div>`;
            }
            return;
        }

        const encountersWithPkm = pokeApi.data.encounters.filter(e => e.pokemon === pokemonName);
        const spriteVersion = GAME_VERSIONS[pokeApi.gameId].spriteVersionGroup;
        const spriteHtml = `<img src="${getSpriteUrl(pkmObj.id, spriteVersion)}" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pkmObj.id}.png'" style="width: 96px; height: 96px; object-fit: contain; image-rendering: pixelated;">`;

        const yields = pkmObj.yields;
        const locations = Array.from(new Set(encountersWithPkm.map(e => e.location))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        const card = document.createElement('div');
        card.className = 'result-card';
        card.setAttribute('data-pokemon', pokemonName);
        card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              ${spriteHtml}
              <div>
                  <h3 style="margin-bottom: 4px;">${escapeHTML(pokemonName)}</h3>
                  <div><strong>Yields:</strong> ${getYieldPillHtml(yields)}</div>
              </div>
          </div>
          <button class="btn btn-icon btn-remove-card">×</button>
      </div>
      
      ${locations.length > 0 ? `
      <h4 class="text-muted" style="margin-bottom: 8px; margin-top: 12px; font-size: 0.9rem;">Locations</h4>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        ${locations.map(loc => {
            const rarityStr = this.getRarityStr(pokemonName, loc);
            const methodsForLoc = Array.from(new Set(encountersWithPkm.filter(e => e.location === loc).map(e => e.method))).sort();

            return `<div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 0;">
                <div>
                    <span class="location-tag clickable-loc research-link" data-loc="${escapeHTML(loc)}">${escapeHTML(loc)}</span>
                    <div style="margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; margin-left: 2px;">
                        ${methodsForLoc.map(m => `<span class="location-tag method-tag clickable-method research-link" data-method="${escapeHTML(m)}" style="font-size: 0.75rem; background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px;">${escapeHTML(m)}</span>`).join('')}
                    </div>
                </div>
                <span class="text-muted" style="font-size: 0.85rem; padding-top: 4px;">${rarityStr}</span>
            </div>`;
        }).join('')}
      </div>` : `
      <div style="margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; text-align: center; border: 1px dashed rgba(255,255,255,0.1);">
        <p class="text-muted" style="font-size: 0.9rem; margin: 0;">No wild encounters found in this game.</p>
        <p style="font-size: 0.75rem; opacity: 0.6; margin-top: 4px;">(This Pokémon may be a starter, evolved form, or event gift)</p>
      </div>
      `}
    `;

        card.querySelector('.btn-remove-card').addEventListener('click', () => {
            card.remove();
            this.activeSearches.delete(pokemonName);
            this.updateSessionTitle();
            this.searchHistory = this.searchHistory.filter(h => !(h.type === 'pokemon' && h.value === pokemonName));
            this.saveHistory();
        });
        card.querySelectorAll('.clickable-loc').forEach(el => {
            el.addEventListener('click', () => this.dispatchNewSession('route', el.getAttribute('data-loc')));
        });
        card.querySelectorAll('.clickable-stat').forEach(el => {
            el.addEventListener('click', () => this.dispatchNewSession('stat', el.getAttribute('data-stat')));
        });
        card.querySelectorAll('.clickable-method').forEach(el => {
            el.addEventListener('click', () => this.dispatchNewSession('method', el.getAttribute('data-method')));
        });

        // Prepend instead of append so newest searches are on top
        this.pokemonResultsContainer.insertBefore(card, this.pokemonResultsContainer.firstChild);
    }

    destroy() {
        this.unsubscribe();
        this.container.remove();
    }
}
