# EV Helper: FireRed & LeafGreen + R/S/E

An advanced, blazing-fast web application designed to help Pokémon players plan, calculate, and target Effort Values (EVs) for their games across Generation 3. Built specifically to be seamless, beautiful, and extremely feature-rich without any server overhead.

## Features

- **Multi-Game Realtime Support:** Dynamically switch context between FireRed/LeafGreen, Ruby/Sapphire, and Emerald data architectures. The UI theme completely shifts color palettes intuitively based on the active cartridge.
- **Glassmorphic Tiling Architecture:** Open an infinite number of "Sessions" concurrently in movable/scrollable tiles. You can cross-reference multiple Pokémon, Routes, and Stats side-by-side simultaneously.
- **Bi-Directional Context Switching:** Click on a Pokémon to see where to find them. Click on the Route they live on to pivot into viewing every other Pokémon available on that Route. Click on an "Attacking" yield pill to instantly drill down into a dedicated "Best Attack Routes" search pane.
- **Intelligent Sorting (Methods & Stats):** Toggle views directly into Pokémon groupings rather than routes when filtering by EV stats, and sort Encounters dynamically by walking, surfing, or fishing methods.
- **Persistent State Autobuilds:** Your current session tabs, active search states, and loaded workspaces constantly autosave straight to your browser `localStorage`. When you refresh the page or return tomorrow, everything is laid out exactly as you left it.

## Underlying Tech Stack

- `HTML5` + `Vanilla JS (ES6 Modules)` + `CSS3 (Vanilla)`
- Fetches all architecture live from **PokeAPI (GraphQL v2 Engine)**
- Uses structural browser caches to execute queries at sub-10ms logic parsing.
