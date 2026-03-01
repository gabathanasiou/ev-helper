// ──────────────────────────────────────────────────────────
//  EV HELPER — THEME DEFINITIONS
//  Each theme has: bg (hex), and named color roles.
//  Colors map to Ink's `color` prop values (ANSI names or hex).
// ──────────────────────────────────────────────────────────

export function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16),
    };
}

export const THEMES = {
    // ── Game themes (Pastel/Nord-inspired) ───────────────────
    firered: {
        name: 'FireRed',
        bg: '#211c1e',            // Soft dark red-gray
        accent: '#bf616a',        // Nord red
        accent2: '#d08770',       // Nord orange
        success: '#a3be8c',
        muted: '#4c566a',
        text: '#eceff4',
        border: '#3b4252',
        borderFocus: '#bf616a',
        statColors: {
            hp: '#bf616a', attack: '#d08770', defense: '#ebcb8b',
            'special-attack': '#b48ead', 'special-defense': '#88c0d0', speed: '#a3be8c',
        },
    },
    leafgreen: {
        name: 'LeafGreen',
        bg: '#1c221e',            // Soft dark green-gray
        accent: '#a3be8c',        // Nord green
        accent2: '#8fbcbb',       // Nord sage/cyan
        success: '#a3be8c',
        muted: '#4c566a',
        text: '#eceff4',
        border: '#3b4252',
        borderFocus: '#a3be8c',
        statColors: {
            hp: '#bf616a', attack: '#d08770', defense: '#ebcb8b',
            'special-attack': '#b48ead', 'special-defense': '#88c0d0', speed: '#a3be8c',
        },
    },
    ruby: {
        name: 'Ruby',
        bg: '#221a24',            // Soft dark magenta-gray
        accent: '#b48ead',        // Nord purple/magenta
        accent2: '#bf616a',       // Nord red
        success: '#a3be8c',
        muted: '#4c566a',
        text: '#eceff4',
        border: '#3b4252',
        borderFocus: '#b48ead',
        statColors: {
            hp: '#bf616a', attack: '#d08770', defense: '#ebcb8b',
            'special-attack': '#b48ead', 'special-defense': '#88c0d0', speed: '#a3be8c',
        },
    },
    sapphire: {
        name: 'Sapphire',
        bg: '#1a202a',            // Soft dark blue-gray
        accent: '#5e81ac',        // Nord dark blue
        accent2: '#81a1c1',       // Nord light blue
        success: '#a3be8c',
        muted: '#4c566a',
        text: '#eceff4',
        border: '#3b4252',
        borderFocus: '#5e81ac',
        statColors: {
            hp: '#bf616a', attack: '#d08770', defense: '#ebcb8b',
            'special-attack': '#b48ead', 'special-defense': '#88c0d0', speed: '#a3be8c',
        },
    },
    emerald: {
        name: 'Emerald',
        bg: '#182422',            // Soft dark teal-gray
        accent: '#88c0d0',        // Nord frost/cyan
        accent2: '#a3be8c',       // Nord green
        success: '#a3be8c',
        muted: '#4c566a',
        text: '#eceff4',
        border: '#3b4252',
        borderFocus: '#88c0d0',
        statColors: {
            hp: '#bf616a', attack: '#d08770', defense: '#ebcb8b',
            'special-attack': '#b48ead', 'special-defense': '#88c0d0', speed: '#a3be8c',
        },
    },
    // ── Bonus themes ─────────────────────────────────────────
    hacker: {
        name: 'Hacker',
        bg: '#000000',
        accent: '#00ff41',
        accent2: '#00cc33',
        success: '#00ff41',
        muted: '#114411',
        text: '#ccffcc',
        border: '#005500',
        borderFocus: '#00ff41',
        statColors: {
            hp: '#00ff41', attack: '#66ff66', defense: '#00cc33',
            'special-attack': '#00ffcc', 'special-defense': '#44ff88', speed: '#ccff44',
        },
    },
    synthwave: {
        name: 'Synthwave',
        bg: '#0d0221',
        accent: '#ff44cc',
        accent2: '#8844ff',
        success: '#44ffcc',
        muted: '#442266',
        text: '#f4f0ff',
        border: '#441166',
        borderFocus: '#ff44cc',
        statColors: {
            hp: '#ff44cc', attack: '#ff6644', defense: '#ffcc44',
            'special-attack': '#8844ff', 'special-defense': '#44ccff', speed: '#44ffcc',
        },
    },
    mono: {
        name: 'Monochrome',
        bg: '#0a0a0a',
        accent: '#ffffff',
        accent2: '#cccccc',
        success: '#cccccc',
        muted: '#555555',
        text: '#eeeeee',
        border: '#333333',
        borderFocus: '#aaaaaa',
        statColors: {
            hp: '#ffffff', attack: '#dddddd', defense: '#bbbbbb',
            'special-attack': '#999999', 'special-defense': '#777777', speed: '#eeeeee',
        },
    },
    nord: {
        name: 'Nord',
        bg: '#1e2430',
        accent: '#88c0d0',
        accent2: '#81a1c1',
        success: '#a3be8c',
        muted: '#4c566a',
        text: '#eceff4',
        border: '#3b4252',
        borderFocus: '#88c0d0',
        statColors: {
            hp: '#bf616a', attack: '#d08770', defense: '#ebcb8b',
            'special-attack': '#b48ead', 'special-defense': '#88c0d0', speed: '#a3be8c',
        },
    },
};

// Map games to their default theme
export const GAME_DEFAULT_THEME = {
    frlg: 'firered',
    rs: 'sapphire',
    emerald: 'emerald',
};

export const THEME_KEYS = Object.keys(THEMES);
