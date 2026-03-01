# Agent Guidelines: EV Helper — Web + CLI + Electron

Welcome, agent! This project has **three distinct sub-projects** sharing the same data source. When working on any of them, read this guide to understand the full architecture before making changes.

---

## 🌐 1. Web App (`index.html` + `js/` + `style.css`)

### Design System & Aesthetics
- **Framework**: Pure HTML, CSS, and Vanilla JS ES6 Modules. No Tailwind or React.
- **CSS Variables**: Check `:root` in `style.css` for the source of truth on colors, spacing, and border radii. Always use `var(--color-...)` rather than hardcoding hex values.
- **Vibe**: The app heavily features a "Glassmorphism" dark mode aesthetic. Use semi-transparent backgrounds with backdrop filters (`backdrop-filter: blur(10px)`) and subtle borders to create depth.
- **Responsiveness**: The app is built mobile-first. The Split Screen workspace feature dynamically switches from Flex Column to Flex Row (`.layout-split`) based on the viewport width and active pane count.

### Architecture & Data Layer
- **Modules**: Located in `js/`:
  - `js/main.js` — Workspace manager. Handles multi-pane drag-and-drop ordering, global zoom scaling, and `localStorage` syncing.
  - `js/state/SessionState.js` — Manages the inner state of each pane.
  - `js/services/pokeApi.js` — Singleton GraphQL fetching layer. Caches to `evAppData`. Update `GAME_VERSIONS` and bump the cache key (e.g. `v9`) when changing data shape.
  - `js/components/SessionPane.js` — One active research window. Tabs: **By Stat**, **By Route**, **By Pokémon**, **By Method**.
  - `js/utils/` — Helper functions including `formatName` (region-stripping) and sprite fallback handlers.
- **PokeAPI GraphQL**: Bulk fetch from `https://beta.pokeapi.co/graphql/v1beta` to avoid rate limits.

### Adding New Features
If adding a new Search Mode or Tab to the `SessionPane`:
1. Update `renderSkeleton()` in `js/components/SessionPane.js` to add the HTML structure.
2. Update `bindEvents()` to handle logic.
3. If handling new data (like a new game generation), update `GAME_VERSIONS` in `js/services/pokeApi.js` and bust the cache key.
4. Keep logic modular.

### Maintenance Checklist
- Did I test the new feature on a narrow viewport width?
- Did I ensure my logic works when 2+ Split Screen panels are open simultaneously?
- Are errors from API fetching caught and displayed nicely to the user?

---

## 💻 2. CLI App (`cli-app/`)

A terminal UI version of the EV Helper built with **React + Ink**. Shares the same PokeAPI data as the web app; caches locally via `os.tmpdir()`.

### Key Files
- `cli-app/source/cli.js` — Entry point. Parses CLI flags (`--pokemon`, `--route`, `--stat`), sets up alternate screen buffer, renders `<App>`.
- `cli-app/source/app.js` — Main React component. Manages all state: history stack, themes, modes, sorting, navigation.
- `cli-app/source/StaticSelectInput.js` — Custom list component with wrap-around navigation, windowed scrolling, and `height={1}` per item to prevent ghost rendering.
- `cli-app/source/api.js` — Data fetching + processing. Caches to a tmp JSON file. Bump cache key (e.g. `v9`) when changing data shape.
- `cli-app/source/themes.js` — All theme definitions (firered, leafgreen, sapphire, ruby, emerald, etc.).

### Build
```bash
cd cli-app && npm run build   # transpiles source/ → dist/ via Babel
```
**Always run a build after editing source files.** The installed `ev-helper` command runs from `dist/`, not `source/`.

### Key Architecture Decisions
- **`historyStack`**: Navigation is a stack of `{ type, value, cursorIndex, sortMode }` objects. Pushing navigates in, popping navigates back. `cursorIndex` and `sortMode` are stored per-level so state is preserved when going back.
- **`isFocused`**: Controls whether the `TextInput` (search box) or the `SelectInput` (list) is active. `false` = list is active.
- **`StaticSelectInput`**: Each rendered item is `height={1}` to prevent text wrapping from pushing items off-screen. The wrap-around logic uses `rotateIndex` (window offset) + `selectedIndex` (position within window). Do not add any extra elements inside the render loop — it will break item counts.
- **Sort modes**: `yield` | `common` | `dex` — stored on `historyStack` entries, not as global state, so they survive navigation.
- **`chromeRows`** prop on `ThemedSelect`: Sets how many terminal rows the non-list UI consumes. Tune this carefully per view to prevent the list `limit` from being too large (ghost items) or too small (wasted space).

### Adding New Themes
Add a new entry to `THEME_KEYS` and `THEMES` in `themes.js`. The `/theme` command picks it up automatically.

### Adding New Game Versions
Update `GAME_VERSIONS` in `api.js` and bump the cache version string. Update `GAME_LABELS` and `GAME_DEFAULT_THEME` in `app.js`.

---

## 🖥️ 3. Electron App (`electron.js`)

A minimal Electron wrapper that loads `index.html` directly as a file — no server, no build step. The entire web app ran natively as a desktop app as-is.

### Running
```bash
npm install     # from project root (electron is in root package.json)
npx electron .
```

### Notes
- `electron.js` uses `nodeIntegration: true` (safe since no remote content is loaded).
- No changes were needed to the web app code to make it work inside Electron.
- This was an experiment — it is not actively maintained beyond the base web app.
