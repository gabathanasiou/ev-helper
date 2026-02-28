import { formatName } from '../utils/helpers.js';

export const GAME_VERSIONS = {
    'frlg': { label: 'FR/LG', themeClass: 'theme-frlg', versions: ["firered", "leafgreen"], spriteVersionGroup: 'generation-iii/firered-leafgreen' },
    'rs': { label: 'R/S', themeClass: 'theme-rs', versions: ["ruby", "sapphire"], spriteVersionGroup: 'generation-iii/ruby-sapphire' },
    'emerald': { label: 'Emerald', themeClass: 'theme-emerald', versions: ["emerald"], spriteVersionGroup: 'generation-iii/emerald' }
};

class PokeApiService {
    constructor() {
        this.data = null;
        this.isLoading = false;
        this.error = null;
        this.fetchPromise = null;
        this.gameId = localStorage.getItem('evSelectedGame') || 'frlg';
    }

    setGameId(gameId) {
        if (!GAME_VERSIONS[gameId]) gameId = 'frlg';
        this.gameId = gameId;
        try {
            localStorage.setItem('evSelectedGame', gameId);
        } catch (e) { }
        this.data = null; // Clear in-memory data cache
    }

    async fetchData() {
        if (this.data) return this.data;
        if (this.fetchPromise) return this.fetchPromise;

        this.fetchPromise = (async () => {
            try {
                return await this._doFetch();
            } finally {
                this.fetchPromise = null;
            }
        })();

        return this.fetchPromise;
    }

    async _doFetch() {
        // Cleanup old and bloated caches from previous development versions
        this.cleanupCache();

        // Check cache
        const cacheKey = `evAppData_${this.gameId}_v5`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                if (parsed && parsed.encounters && parsed.pokemonListArray && parsed.encounters[0]?.rarity !== undefined) {
                    console.log("Cached data found: " + parsed.encounters.length + " encounters.");
                    this.data = parsed;
                    return this.data;
                } else {
                    console.warn("Cache format outdated, triggering new fetch.");
                }
            } catch (e) {
                console.warn("Invalid cache data, will fetch anew.");
            }
        }

        this.isLoading = true;
        const config = GAME_VERSIONS[this.gameId];
        const versionsString = config.versions.map(v => `"${v}"`).join(", ");

        const query = `
      query {
        pokemon_v2_encounter(where: {pokemon_v2_version: {name: {_in: [${versionsString}]}}}) {
          pokemon_v2_pokemon {
            name
            id
            pokemon_v2_pokemonstats(where: {effort: {_gt: 0}}) {
              effort
              pokemon_v2_stat {
                name
              }
            }
          }
          pokemon_v2_locationarea {
            name
            pokemon_v2_location {
              name
            }
          }
          pokemon_v2_version {
            name
          }
          pokemon_v2_encounterslot {
            rarity
            pokemon_v2_encountermethod {
              name
            }
          }
        }
      }
    `;

        try {
            console.log("Starting PokeAPI GraphQL fetch...");
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error("PokeAPI responded with status:", response.status);
                throw new Error(`Network payload failed with status: ${response.status}`);
            }

            const result = await response.json();

            if (result.errors) {
                console.error("GraphQL Errors:", result.errors);
                throw new Error("GraphQL query returned errors.");
            }

            console.log("Raw data received, processing...");
            this.data = this.processData(result.data.pokemon_v2_encounter);
            console.log("Processing complete. Saving to cache...");

            try {
                localStorage.setItem(cacheKey, JSON.stringify(this.data));
            } catch (storageError) {
                console.warn("localStorage exhausted. Cache will not be saved for this game session.", storageError);
                // Attempt emergency cleanup one more time
                this.cleanupCache(true);
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(this.data));
                } catch (e) {
                    // Give up on persistent cache, just stay in memory
                }
            }

            this.isLoading = false;
            return this.data;
        } catch (error) {
            this.isLoading = false;
            if (error.name === 'AbortError') {
                this.error = "Connection timed out. Please check your internet and refresh.";
            } else {
                this.error = "Failed to load encounter data.";
            }
            console.error("PokeAPI Fetch Error:", error);
            throw error;
        }
    }

    cleanupCache(aggressive = false) {
        const currentVersion = '_v5';
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('evAppData_')) {
                const isCorrectVersion = key.endsWith(currentVersion);
                const isCurrentGame = key.includes(`_${this.gameId}_`);

                // If aggressive, we wipe everything except the absolute current active game key
                // If not aggressive, we only wipe keys that are NOT the correct version (_v5)
                if (aggressive) {
                    if (key !== `evAppData_${this.gameId}${currentVersion}`) {
                        console.log("Cleanup (Aggressive): Removing key: " + key);
                        localStorage.removeItem(key);
                        i--;
                    }
                } else if (!isCorrectVersion) {
                    console.log("Cleanup (Stale Version): Removing key: " + key);
                    localStorage.removeItem(key);
                    i--;
                }
            }
        }
    }

    processData(encountersRaw) {
        const data = {
            encounters: [],
            locations: new Set(),
            pokemonList: new Set()
        };

        encountersRaw.forEach(enc => {
            const locationAreaName = enc.pokemon_v2_locationarea.name;
            const locationName = enc.pokemon_v2_locationarea.pokemon_v2_location.name;
            const locFriendly = formatName(locationName);
            const areaFriendly = formatName(locationAreaName);

            const pkmnName = enc.pokemon_v2_pokemon.name;
            const pkmnId = enc.pokemon_v2_pokemon.id;
            const version = enc.pokemon_v2_version.name;
            const rarity = enc.pokemon_v2_encounterslot ? enc.pokemon_v2_encounterslot.rarity : 0;
            const methodRaw = (enc.pokemon_v2_encounterslot && enc.pokemon_v2_encounterslot.pokemon_v2_encountermethod) ? enc.pokemon_v2_encounterslot.pokemon_v2_encountermethod.name : 'walk';

            const evYields = enc.pokemon_v2_pokemon.pokemon_v2_pokemonstats.map(stat => ({
                stat: stat.pokemon_v2_stat.name,
                effort: stat.effort
            }));

            // Only save encounters that actually give EVs
            if (evYields.length > 0) {
                data.locations.add(locFriendly);
                data.pokemonList.add(formatName(pkmnName));

                data.encounters.push({
                    pokemon: formatName(pkmnName),
                    id: pkmnId, // SAVE ID HERE
                    location: locFriendly,
                    area: areaFriendly,
                    method: formatName(methodRaw),
                    version: version,
                    yields: evYields,
                    rarity: rarity
                });
            }
        });

        data.locations = Array.from(data.locations).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        // Change from Set of strings to array of objects with id for search
        const uniquePkmKeys = new Set();
        const pkmList = [];
        data.encounters.forEach(e => {
            if (!uniquePkmKeys.has(e.pokemon)) {
                uniquePkmKeys.add(e.pokemon);
                pkmList.push({ name: e.pokemon, id: e.id, yields: e.yields });
            }
        });

        data.pokemonListArray = pkmList.sort((a, b) => a.name.localeCompare(b.name));
        data.pokemonList = data.pokemonListArray.map(p => p.name);

        console.log("Data processing complete. Pokemon found: " + data.pokemonListArray.length);
        return data;
    }
}

// Export a singleton instance
export const pokeApi = new PokeApiService();
