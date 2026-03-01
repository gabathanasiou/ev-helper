# EV Helper CLI

A terminal UI for the [EV Helper](https://gabathanasiou.github.io/ev-helper/) — plan your Gen 3 EV training without leaving your shell.

Built with **React + Ink**. Shares the same PokeAPI GraphQL data layer as the web app, with local caching so launches after the first are near-instant.

---

## Installation & Run

```bash
# Run instantly (reccomended)
npx @gabathanasiou/ev-helper

# Or install globally
npm install -g @gabathanasiou/ev-helper
```

To build and run from source:

```bash
npm install
npm run build
node dist/cli.js
```

Requires **Node.js ≥ 16**.

---

## Usage

```bash
ev-helper                        # launch interactive mode
ev-helper --pokemon=Pikachu      # open directly on a Pokémon
ev-helper --route="Route 4"      # open directly on a route
ev-helper --stat=speed           # open directly on a stat
```

---

## Keybindings

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate list (wraps around at top/bottom) |
| `→` / `Enter` | Select / drill into item |
| `←` / `Esc` | Go back one level |
| `Tab` | Cycle search mode (home) · Cycle sort order (detail views) |
| `Ctrl+S` | Open highlighted item in a new Terminal window |
| `Ctrl+N` | Jump back to home screen |
| `Ctrl+C` | Quit |

---

## Sort Modes (on Route & Stat views)

Press **Tab** while in a Pokémon list to cycle through:

| Mode | Description |
|------|-------------|
| **EV Yield** | Highest total EV yield first (default) |
| **Encounter Rate** | Most commonly encountered first |
| **Pokédex #** | Regional Pokédex order |

The sort mode is saved per navigation level — going back preserves the order you had set.

---

## Games Supported

| Flag | Games |
|------|-------|
| `frlg` (default) | FireRed & LeafGreen |
| `rs` | Ruby & Sapphire |
| `emerald` | Emerald |

Switch game with the `/game <id>` command inside the app. The theme will update automatically to match.

---

## Available Themes

| Theme | Description |
|-------|-------------|
| `firered` | Deep red — FireRed default |
| `leafgreen` | Leaf green |
| `sapphire` | Ocean blue |
| `ruby` | Crimson |
| `emerald` | Forest green — Emerald default |
| `gold` | Warm amber |
| `silver` | Cool silver |
| `crystal` | Icy cyan |

Switch with `/theme <name>` inside the app.

---

## Building

```bash
npm run build   # transpiles source/ → dist/ via Babel
npm run dev     # watch mode for development
```

Always rebuild after editing source files — the `ev-helper` command runs from `dist/`.

---

## ❤️ Credits

- **[PokeAPI](https://pokeapi.co/)**: Providing the rich Pokémon data layer.
- **[Ink](https://github.com/vadimdemedes/ink)**: For making React in the terminal possible.
- **[Babel](https://babeljs.io/)**: For the JSX transpilation.

---

## Architecture Notes

- **`source/app.js`** — Main application component. Navigation stack, themes, sorting, all keyboard handling.
- **`source/StaticSelectInput.js`** — Custom list component with wrap-around scrolling and `height={1}` per item to prevent ghost rendering from label wrapping.
- **`source/api.js`** — PokeAPI GraphQL fetch + processing. Cached to a temp JSON file.
- **`source/themes.js`** — All theme color definitions.
- **`source/cli.js`** — Entry point. Parses flags, sets up alternate screen buffer, renders the app.
