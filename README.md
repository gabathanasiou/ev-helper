# EV Helper: FireRed & LeafGreen + R/S/E

[**Live App**](https://gabathanasiou.github.io/ev-helper/) • [**NPM Package**](https://www.npmjs.com/package/@gabathanasiou/ev-helper) • [**Support on Ko-fi**](https://ko-fi.com/gabath)

An advanced, blazing-fast web application designed to help Pokémon players plan, calculate, and target Effort Values (EVs) for their games across Generation 3. Built specifically to be seamless, beautiful, and extremely feature-rich without any server overhead.

---

## ✨ Web App Features

- **Multi-Game Realtime Support:** Dynamically switch context between FireRed/LeafGreen, Ruby/Sapphire, and Emerald data architectures. The UI theme completely shifts color palettes intuitively based on the active cartridge.
- **Glassmorphic Tiling Architecture:** Open an infinite number of "Sessions" concurrently in movable/scrollable tiles. You can cross-reference multiple Pokémon, Routes, and Stats side-by-side simultaneously.
- **Bi-Directional Context Switching:** Click on a Pokémon to see where to find them. Click on the Route they live on to pivot into viewing every other Pokémon available on that Route. Click on an "Attacking" yield pill to instantly drill down into a dedicated "Best Attack Routes" search pane.
- **Intelligent Sorting (Methods & Stats):** Toggle views directly into Pokémon groupings rather than routes when filtering by EV stats, and sort Encounters dynamically by walking, surfing, or fishing methods.
- **Persistent State Autobuilds:** Your current session tabs, active search states, and loaded workspaces constantly autosave straight to your browser `localStorage`. When you refresh the page or return tomorrow, everything is laid out exactly as you left it.

## Underlying Tech Stack

- `HTML5` + `Vanilla JS (ES6 Modules)` + `CSS3 (Vanilla)`
- Fetches all data live from **PokeAPI (GraphQL v2 Engine)**
- Uses structural browser caches to execute queries at sub-10ms logic parsing.

---

## 💻 CLI App

> Located in `cli-app/` — a passion project for terminal lovers.

A fully-featured terminal UI version of the EV Helper, built with **React + Ink** and running entirely in your shell. It shares the same PokeAPI data layer as the web app and caches responses locally so subsequent launches are near-instant.

### Features
- **Three search modes**: Pokémon, Route, and Stat — switchable with `Tab`
- **Deep navigation**: Drill from a stat → route → Pokémon and back with arrow keys
- **Tab-cycle sorting** on Pokémon lists: by EV Yield, Encounter Rate, or Pokédex #
- **Wrap-around navigation**: Pressing ↓ at the bottom wraps to the top (and vice versa)
- **Multiple themes**: Automatically picks a theme based on your active game (`frlg` → FireRed red, `rs` → Sapphire blue, `emerald` → Emerald green). Switch themes live with `/theme <name>`
- **Ctrl+S shortcut**: Opens the currently highlighted item in a new Terminal window
- **Full-screen experience**: Uses the alternate screen buffer so it doesn't pollute your scroll history

### Installation

```bash
# To run instantly without installing
npx @gabathanasiou/ev-helper

# Or install globally
npm install -g @gabathanasiou/ev-helper
```

To build from source:

```bash
cd cli-app
npm install
npm run build
```

### Keybindings

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate list (wraps around) |
| `→` / `Enter` | Select item / drill in |
| `←` / `Esc` | Go back |
| `Tab` | Switch search mode (home) or cycle sort order (detail views) |
| `Ctrl+S` | Open highlighted item in a new terminal |
| `Ctrl+N` | Return to home screen |
| `/` | Type `/game` or `/theme` commands |
| `Esc` (home) | Quit |

### Tech
- **React + Ink** — React rendered to the terminal
- **Babel** — JSX transpilation
- **meow** — CLI argument parsing
- **Lodash.isequal** — Smart list diffing for cursor stability

---

## 🖥️ Electron App

> Located at `electron.js` in the root — a fun experiment.

A standalone macOS desktop app built by wrapping the existing web app in **Electron**. No server required — it loads `index.html` directly as a file, so the full web experience runs as a native desktop application without a browser.

This was a quick experiment to see how the glassmorphic web UI would feel as a proper app on the desktop. Since the app is built entirely in vanilla HTML/CSS/JS with no build step, it "just worked" immediately inside Electron.

### Running it

```bash
npm install          # from the project root
npx electron .
```

### Tech
- **Electron** — Chromium shell wrapping the HTML app
- Zero code changes needed — loads `index.html` directly

---

## ❤️ Credits & Acknowledgments

This project wouldn't be possible without the incredible work of the open-source community:

- **[PokeAPI](https://pokeapi.co/)**: The absolute backbone of this project. Provides the comprehensive GraphQL API that powers all our data.
- **[Ink](https://github.com/vadimdemedes/ink)**: Powers the CLI's React-to-terminal rendering. Truly magical.
- **[React](https://reactjs.org/)**: Used extensively in the CLI layer.
- **[Electron](https://www.electronjs.org/)**: Facilitated our native desktop experiment.
- **[Vite](https://vitejs.dev/) / Babel**: Building and transpilation.

---

## Support

If you found this tool helpful for building your competitive or ribbon-master teams, consider supporting future development on [**Ko-fi**](https://ko-fi.com/gabath).
