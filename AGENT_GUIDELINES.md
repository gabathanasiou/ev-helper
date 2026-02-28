# Agent Guidelines: LeafGreen & FireRed EV Helper

Welcome, agent! When maintaining or expanding this project, please adhere to the following guidelines to ensure we keep the premium, responsive, and robust nature of the application.

## 1. Design System & Aesthetics
- **Framework**: We use pure HTML, CSS, and Vanilla JS ES6 Modules. No Tailwind or React unless explicitly requested by the user later.
- **CSS Variables**: Check `:root` in `style.css` for the source of truth on colors, spacing, and border radii. Always use `var(--color-...)` rather than hardcoding hex values.
- **Vibe**: The app heavily features a "Glassmorphism" dark mode aesthetic. Use semi-transparent backgrounds with backdrop filters (`backdrop-filter: blur(10px)`) and subtle borders to create depth.
- **Responsiveness**: The app is built mobile-first. The Split Screen workspace feature dynamically switches from Flex Column to Flex Row (`.layout-split`) based on the viewport width and active pane count.

## 2. Architecture & Data Layer
- **Modules**: The app is broken into ES6 modules located in `js/`.
  - `js/main.js`: The workspace manager. Handles multi-pane drag-and-drop ordering, global zoom scaling, and `localStorage` syncing of the workspace layout.
  - `js/state/SessionState.js`: Manages the pane's inner state (historically EV tracking, now adapted).
  - `js/services/pokeApi.js`: Singleton GraphQL fetching layer. Caches to `evAppData`.
  - `js/components/SessionPane.js`: The class representing one active research window. Support for tabs: **By Stat** (with Route/PKMN grouping toggle), **By Route**, **By Pokémon**, and **By Method**.
  - `js/utils/`: Helper functions including `formatName` (region-stripping) and sprite fallback handlers.
- **PokeAPI GraphQL**: We fetch data in bulk from `https://beta.pokeapi.co/graphql/v1beta` to avoid rate limits.

## 3. Adding New Features
If adding a new Search Mode or Tab to the `SessionPane`:
1. Update `renderSkeleton()` in `js/components/SessionPane.js` to add the HTML structure.
2. Update `bindEvents()` to handle logic.
3. If handling new data (like a new game generation), update `GAME_VERSIONS` in `js/services/pokeApi.js` and bust the `v5` cache key.
4. Keep logic modular.

## 4. Maintenance Checklist
- Did I test the new feature on a narrow viewport width?
- Did I ensure my logic works when 2 or more Split Screen panels are open simultaneously?
- Are errors from API fetching caught and displayed nicely to the user?
