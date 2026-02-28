---
description: How to modify or expand the Pokémon GraphQL data layer
---
# Skill: Pokémon GraphQL Mastery

This workflow defines how to add new data fields (e.g., Hidden Abilities, Movepools, or Trainer stats) to the `EV Helper` repository using the PokeAPI GraphQL v2 beta engine.

## 1. Locate the Query
The primary data fetching logic resides in `js/services/pokeApi.js` inside the `fetchData()` method.

## 2. Testing Your Query
NEVER run raw GraphQL against the code without testing it first in the **PokeAPI GraphQL Sandbox**.
URL: `https://beta.pokeapi.co/graphql/console/`

## 3. Query Structure Rules
- Always filter by `version_group_id` using the dynamic IDs configured in the `GAME_VERSIONS` constant.
- Nested structures (like `pokemon_v2_encounterslot`) are required for retrieving **Method** and **Rarity**.
- Use fragments or flat strings to keep the response payload small.

## 4. Data Processing
After adding a field to the query:
1. Open `processData()` in `js/services/pokeApi.js`.
2. Map the new JSON path to the internal `encounters` object.
3. **CRITICAL:** Increment the version suffix in `cacheKey` (e.g., from `_v5` to `_v6`) to force users to download the fresh schema change.

## 5. UI Integration
- If the data is per-pokemon, update the entry rendering in `js/components/SessionPane.js`.
- Always add a fallback for images because some legacy sprites are missing in the GitHub repo but present in the API.
