import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const GAME_VERSIONS = {
    'frlg': { versions: ["firered", "leafgreen"], pokedexId: 2 },
    'rs': { versions: ["ruby", "sapphire"], pokedexId: 4 },
    'emerald': { versions: ["emerald"], pokedexId: 4 }
};

function formatName(str) {
    if (!str) return '';
    return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export async function fetchData(gameId = 'frlg') {
    const config = GAME_VERSIONS[gameId] || GAME_VERSIONS['frlg'];
    const cacheFile = path.join(os.tmpdir(), `ev_helper_cache_${gameId}_v9.json`);

    try {
        const cached = await fs.readFile(cacheFile, 'utf-8');
        const parsed = JSON.parse(cached);
        if (parsed && parsed.encounters && parsed.pokedex) {
            return parsed;
        }
    } catch (e) {
        // No cache or invalid
    }

    const versionsString = config.versions.map(v => `"${v}"`).join(", ");

    const query = `
      query {
        pokemon_v2_encounter(where: {pokemon_v2_version: {name: {_in: [${versionsString}]}}}) {
          pokemon_v2_pokemon { name id pokemon_v2_pokemonstats(where: {effort: {_gt: 0}}) { effort pokemon_v2_stat { name } } }
          pokemon_v2_locationarea { name pokemon_v2_location { name } }
          pokemon_v2_version { name }
          pokemon_v2_encounterslot { rarity pokemon_v2_encountermethod { name } }
        }
        pokemon_v2_pokedex_by_pk(id: ${config.pokedexId}) {
          pokemon_v2_pokemondexnumbers(order_by: {pokedex_number: asc}) {
            pokedex_number
            pokemon_v2_pokemonspecy { name pokemon_v2_pokemons { id name pokemon_v2_pokemonstats(where: {effort: {_gt: 0}}) { effort pokemon_v2_stat { name } } } }
          }
        }
      }
    `;

    const response = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });

    if (!response.ok) throw new Error("Fetch failed");
    const result = await response.json();

    const data = processData(result.data.pokemon_v2_encounter, result.data.pokemon_v2_pokedex_by_pk);

    try {
        await fs.writeFile(cacheFile, JSON.stringify(data), 'utf-8');
    } catch (e) { }

    return data;
}

function processData(encountersRaw, pokedexRaw) {
    const data = { encounters: [], pokedex: [], pokemonListArray: [] };
    const pkmListMap = new Map();

    if (pokedexRaw && pokedexRaw.pokemon_v2_pokemondexnumbers) {
        pokedexRaw.pokemon_v2_pokemondexnumbers.forEach(entry => {
            const species = entry.pokemon_v2_pokemonspecy;
            const pkm = species.pokemon_v2_pokemons[0];
            if (pkm) {
                const yields = pkm.pokemon_v2_pokemonstats.map(stat => ({ stat: stat.pokemon_v2_stat.name, effort: stat.effort }));
                const pkmObj = { name: formatName(pkm.name), id: pkm.id, yields, dexNumber: entry.pokedex_number };
                data.pokedex.push(pkmObj);
                pkmListMap.set(pkmObj.name, pkmObj);
            }
        });
    }

    encountersRaw.forEach(enc => {
        const pkmnName = formatName(enc.pokemon_v2_pokemon.name);
        const yields = enc.pokemon_v2_pokemon.pokemon_v2_pokemonstats.map(s => ({ stat: s.pokemon_v2_stat.name, effort: s.effort }));
        if (yields.length > 0) {
            let locName = formatName(enc.pokemon_v2_locationarea.pokemon_v2_location.name);
            let areaName = formatName(enc.pokemon_v2_locationarea.name);
            // Clean up redundant region prefixes that the PokeAPI adds
            locName = locName.replace(/^(Kanto|Hoenn)\s+/i, '');
            areaName = areaName.replace(/^(Kanto|Hoenn)\s+/i, '');

            const method = formatName(enc.pokemon_v2_encounterslot?.pokemon_v2_encountermethod?.name || 'walk');

            // Skip gift pokemon (e.g., starter, given by an NPC) since we cannot grind them
            if (method.toLowerCase().includes('gift')) {
                return;
            }

            data.encounters.push({
                pokemon: pkmnName,
                id: enc.pokemon_v2_pokemon.id,
                location: locName,
                area: areaName,
                method,
                rarity: enc.pokemon_v2_encounterslot?.rarity || 0,
                yields
            });
            if (!pkmListMap.has(pkmnName)) {
                pkmListMap.set(pkmnName, { name: pkmnName, id: enc.pokemon_v2_pokemon.id, yields, dexNumber: 9999 + enc.pokemon_v2_pokemon.id });
            }
        }
    });

    data.pokemonListArray = Array.from(pkmListMap.values()).sort((a, b) => a.dexNumber - b.dexNumber);
    return data;
}
