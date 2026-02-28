export function formatName(name) {
    if (!name) return "";
    let str = name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    str = str.replace(/^Kanto\s+/, '').replace(/^Hoenn\s+/, '');
    return str;
}

// Utility to generate yield pills HTML
export function getYieldPillHtml(yields) {
    const cssVarMap = {
        'hp': 'ev-hp', 'attack': 'ev-attack', 'defense': 'ev-defense',
        'special-attack': 'ev-spatk', 'special-defense': 'ev-spdef', 'speed': 'ev-speed'
    };
    return yields.map(y => {
        const bgColor = `var(--${cssVarMap[y.stat] || 'primary'})`;
        return `<span class="yield-pill clickable-stat" data-stat="${escapeHTML(y.stat)}" style="background-color: ${bgColor}; cursor: pointer; transition: opacity 0.2s;">+${y.effort} ${formatName(y.stat)}</span>`;
    }).join('');
}

// Helper to escape HTML to prevent XSS in innerHTML
export function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Get the Game-Specific Pokemon sprite
export function getSpriteUrl(pokemonId, spriteVersionGroup) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/${spriteVersionGroup}/${pokemonId}.png`;
}

// Get the mini-icon
export function getIconUrl(pokemonId) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons/${pokemonId}.png`;
}
