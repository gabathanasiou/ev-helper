---
description: Guidelines for maintaining the EV Helper design system and aesthetics
---
# Skill: EV Helper Design & Styling

This workflow ensures any new UI elements added to the `EV Helper` project match the premium, glassmorphic, and dynamic Pokémon-themed aesthetic.

## 1. Color System
The app uses a dynamic variable-based color system. Never use hardcoded hex values in components.
- **Base Theme**: `:root` defines default glass backgrounds (`--panel-bg`) and blurs (`--panel-blur`).
- **Dynamic Themes**: Use `.theme-frlg`, `.theme-rs`, and `.theme-emerald` on the `html` tag to shift the `--primary` and `--bg-gradient` variables.
- **EV Stats**: Stats have dedicated variables: `--ev-hp`, `--ev-attack`, etc.

## 2. Component Structure (Glassmorphism)
All primary search and result components should follow the "Glass Plate" pattern:
```css
.glass-panel {
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur));
  border: 1px solid var(--panel-border);
  border-radius: var(--border-radius-lg);
}
```

## 3. Dynamic Gradients
To prevent "muddy" transitions (e.g., Red to Green), always use a **3-stop gradient** with a neutral/cool dark midpoint (`#111424`).
- **Correct**: `linear-gradient(135deg, [ColorA] 0%, #111424 50%, [ColorB] 100%)`

## 4. Interaction & Feedback
- **Hover States**: Links and interactive Pokémon/Route tags should use `opacity: 0.8` or a subtle `transform: translateY(-1px)` on hover.
- **Active States**: Standard toggle groups (like the Group by Route/PKMN toggle) should use `rgba(255,255,255,0.15)` for the active state background for high contrast against the dark glass.

## 5. Iconography
- **Cartridges**: Game icons are SVGs with `stroke="currentColor"`. Use inline styles or classes (`.frlg-btn svg`) to set the `color` property to match the version color.
- **Logo**: The main logo is a vector SVG containing a Pokeball and a text gradient. Ensure the `logo-text-grad` ID is preserved in the XML.

## 6. Layout Workspace
The app uses a tiling workspace. New panes must be wrapped in `.pane-wrapper` to ensure they participate in the drag-and-drop sorting and global zoom logic.
