import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Text, Box, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from './StaticSelectInput.js';
import { fetchData } from './api.js';
import { exec } from 'child_process';
import { THEMES, THEME_KEYS, GAME_DEFAULT_THEME, hexToRgb } from './themes.js';
import Conf from 'conf';

const config = new Conf({ projectName: 'ev-helper' });


const MODES = ['pokemon', 'route', 'stat'];
const GAME_LABELS = { 'frlg': 'FireRed/LeafGreen', 'rs': 'Ruby/Sapphire', 'emerald': 'Emerald' };
const SORT_MODES = ['yield', 'common', 'dex'];
const SORT_LABELS = { yield: 'EV Yield', common: 'Encounter Rate', dex: 'Pokédex #' };

// Apply terminal background color via ANSI escape codes
function applyBg(hex) {
	const { r, g, b } = hexToRgb(hex);
	process.stdout.write(`\x1b[48;2;${r};${g};${b}m\x1b[2J\x1b[H`);
}

// ── Themed components (created per render using current theme) ──
function makeComponents(t) {
	const Indicator = ({ isSelected }) => (
		<Text color={isSelected ? t.accent : t.muted}>{isSelected ? '› ' : '  '}</Text>
	);
	const Item = ({ isSelected, label }) => (
		<Text color={isSelected ? t.text : t.muted} wrap="truncate-end">{label}</Text>
	);
	return { Indicator, Item };
}

export default function App({ game = 'frlg', initialMode = 'POKEMON', initialQuery = '', initialTheme = null }) {
	const { exit } = useApp();
	const [query, setQuery] = useState(initialQuery);
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [loadFrame, setLoadFrame] = useState('⠋');
	const [modeIndex, setModeIndex] = useState(Math.max(0, MODES.indexOf(initialMode.toLowerCase())));
	const [isFocused, setIsFocused] = useState(true);
	const [activeGame, setActiveGame] = useState(game || config.get('game') || 'frlg');
	const [themeKey, setThemeKey] = useState(initialTheme || config.get('theme') || GAME_DEFAULT_THEME[activeGame] || 'firered');

	const [dims, setDims] = useState({ c: process.stdout.columns || 80, r: process.stdout.rows || 24 });
	const [historyStack, setHistoryStack] = useState([]);
	const cursorRef = useRef(0);
	const dashCursorRef = useRef(0);
	const hoveredValueRef = useRef(null);
	const activeItemsRef = useRef([]);
	const activeOnSelectRef = useRef(null);
	const [searchKey, setSearchKey] = useState(0);

	const t = THEMES[themeKey] || THEMES['firered'];
	const { Indicator, Item } = useMemo(() => makeComponents(t), [themeKey]);

	// ── Apply background color when theme changes ──
	useEffect(() => {
		applyBg(t.bg);
		config.set('theme', themeKey);
		config.set('game', activeGame);
	}, [themeKey, activeGame]);


	// ── Resize ──
	useEffect(() => {
		const fn = () => setDims({ c: process.stdout.columns, r: process.stdout.rows });
		process.stdout.on('resize', fn);
		return () => process.stdout.off('resize', fn);
	}, []);

	// ── Loading animation ──
	useEffect(() => {
		if (!loading) return;
		const f = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
		let i = 0;
		const id = setInterval(() => setLoadFrame(f[i++ % f.length]), 80);
		return () => clearInterval(id);
	}, [loading]);

	// ── Fetch ──
	useEffect(() => {
		setLoading(true);
		fetchData(activeGame).then(r => { setData(r); setLoading(false); });
	}, [activeGame]);

	// ── Navigation ──
	const trackHighlight = (item, list) => {
		const idx = list.findIndex(x => x.value === item.value);
		if (idx >= 0) cursorRef.current = idx;
		hoveredValueRef.current = item.value;
	};
	const clampedIndex = (idx, list) => Math.max(0, Math.min(idx || 0, list.length - 1));

	const pushHistory = (type, value) => {
		if (historyStack.length === 0) dashCursorRef.current = cursorRef.current;
		setHistoryStack(s => {
			const updated = s.length > 0
				? [...s.slice(0, -1), { ...s[s.length - 1], cursorIndex: cursorRef.current }]
				: s;
			return [...updated, { type, value, cursorIndex: 0, sortMode: 'yield' }];
		});
		cursorRef.current = 0;
		setIsFocused(false);
	};
	const popHistory = () => {
		setHistoryStack(s => {
			const n = s.slice(0, -1);
			cursorRef.current = n.length > 0 ? (n[n.length - 1].cursorIndex || 0) : dashCursorRef.current;
			if (n.length === 0) {
				// highlight the list by default when going back
				setIsFocused(false);
			}
			return n;
		});
	};

	const currentView = historyStack.length > 0 ? historyStack[historyStack.length - 1] : null;
	const activeMode = MODES[modeIndex];

	// ── Breadcrumb ──
	const crumbs = useMemo(() => {
		const c = ['Home'];
		historyStack.forEach(h => {
			if (h.type === 'POKEMON') c.push(h.value?.name || '?');
			else if (h.type === 'ROUTE') c.push(h.value);
			else if (h.type === 'STAT') c.push((h.value?.stat || '').toUpperCase());
		});
		return c;
	}, [historyStack]);

	// ── Input ──
	useInput((input, key) => {
		if (!data) return;

		if (key.ctrl && input.toLowerCase() === 's' && hoveredValueRef.current) {
			const hVal = hoveredValueRef.current;
			if (hVal.startsWith('CMD:')) return;

			const parts = hVal.split(':');
			const type = parts[0];
			const payload = parts.slice(1).join(':');

			let flag = '';
			let arg = '';
			if (type === 'PKM') {
				flag = '--pokemon';
				const p = data.pokemonListArray.find(x => x.id === parseInt(payload));
				arg = p ? p.name : '';
			}
			if (type === 'RTE') { flag = '--route'; arg = payload; }
			if (type === 'STA') { flag = '--stat'; arg = payload; }
			// Edge case: if value format doesn't match above, check if it's raw
			if (!flag) {
				if (currentView?.type === 'POKEMON' && !hVal.includes(':')) { flag = '--route'; arg = hVal; } // route string from pokemon detail
			}

			if (flag && arg) {
				exec(`osascript -e 'tell app "Terminal" to do script "ev-helper ${flag}=\\"${String(arg).replace(/"/g, '\\"')}\\""'`);
			}
			return;
		}

		// Handle typing when not focused on the search box (dashboard only)
		if (!isFocused && !currentView) {
			const isTyping = input.length > 0 && !input.startsWith('\x1b') && !key.ctrl && !key.meta && !key.upArrow && !key.downArrow && !key.leftArrow && !key.rightArrow && !key.return && !key.enter && !key.escape && !key.tab;
			const isBackspacing = key.backspace || key.delete;

			if (isTyping || isBackspacing) {
				setIsFocused(true);
				setSearchKey(s => s + 1);
				dashCursorRef.current = 0;
				if (isBackspacing) {
					setQuery(q => q.slice(0, -1));
				} else {
					setQuery(q => q + input);
				}
				return;
			}
		}

		if (key.tab && !currentView) { setModeIndex(p => (p + 1) % MODES.length); setQuery(''); setIsFocused(true); dashCursorRef.current = 0; }
		if (key.tab && currentView && (currentView.type === 'ROUTE' || currentView.type === 'STAT')) {
			setHistoryStack(s => {
				const n = [...s];
				const cv = n[n.length - 1];
				cv.sortMode = SORT_MODES[(SORT_MODES.indexOf(cv.sortMode || 'yield') + 1) % SORT_MODES.length];
				return n;
			});
		}
		if (key.escape || key.leftArrow || ((key.backspace || key.delete) && currentView)) {
			if (currentView) popHistory();
			else if (key.escape) exit();
			else if (!isFocused) setIsFocused(true);
		}
		if (key.downArrow && isFocused && displayList.length > 0) {
			setIsFocused(false);
			dashCursorRef.current = clampedIndex(1, displayList);
		}
		if ((key.return || key.enter || key.rightArrow) && isFocused && displayList.length > 0) {
			handleSelect(displayList[0]);
		}
		if (input.toLowerCase() === 'n' && key.ctrl) { setHistoryStack([]); setQuery(''); setIsFocused(true); cursorRef.current = 0; dashCursorRef.current = 0; }
	});

	// ── Display list ──
	const displayList = useMemo(() => {
		if (query.startsWith('/')) {
			const q = query.toLowerCase();
			const gameOpts = [
				{ label: '/game frlg           FireRed / LeafGreen  → applies FireRed theme', value: 'CMD:sw_frlg' },
				{ label: '/game rs             Ruby / Sapphire      → applies Sapphire theme', value: 'CMD:sw_rs' },
				{ label: '/game emerald        Emerald              → applies Emerald theme', value: 'CMD:sw_em' },
			];
			const themeOpts = THEME_KEYS.map(k => ({
				label: `/theme ${k.padEnd(14)} ${THEMES[k].name}`,
				value: `CMD:theme_${k}`,
			}));
			const extra = [{ label: '/quit', value: 'CMD:quit' }];
			return [...gameOpts, ...themeOpts, ...extra].filter(c => c.label.toLowerCase().includes(q));
		}
		if (!data) return [];
		const q = query.toLowerCase().trim();
		if (!q && activeMode !== 'stat') return [];

		if (activeMode === 'pokemon') {
			return data.pokemonListArray
				.filter(p => p.name.toLowerCase().includes(q))
				.sort((a, b) => a.dexNumber - b.dexNumber)
				.map(p => {
					const ev = p.yields.map(y => `+${y.effort} ${y.stat.toUpperCase().slice(0, 3)}`).join(' ');
					const dex = p.dexNumber < 9999 ? `#${String(p.dexNumber).padStart(3, '0')}` : '    ';
					const pEncs = data.encounters.filter(e => e.id === p.id);
					const methods = [...new Set(pEncs.map(e => e.method))];
					const methodStr = methods.length > 0 ? methods.join(', ') : 'No encounters';
					return { label: `${dex}  ${p.name.padEnd(16)} ${ev.padEnd(22)} ${methodStr}`, value: `PKM:${p.id}` };
				});
		}
		if (activeMode === 'route') {
			const routes = [...new Set(data.encounters.map(e => e.location))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
			return routes.filter(r => r.toLowerCase().includes(q)).map(r => {
				const n = new Set(data.encounters.filter(e => e.location === r).map(e => e.id)).size;
				return { label: `${r.padEnd(32)} ${n} pokemon`, value: `RTE:${r}` };
			});
		}
		if (activeMode === 'stat') {
			const stats = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
			return stats.filter(s => s.includes(q)).map(s => {
				const n = new Set(data.encounters.filter(e => e.yields.some(y => y.stat === s)).map(e => e.id)).size;
				return { label: `${s.toUpperCase().padEnd(20)} ${n} pokemon`, value: `STA:${s}` };
			});
		}
		return [];
	}, [query, data, activeMode]);

	const handleSelect = (item) => {
		const [type, ...rest] = item.value.split(':');
		const payload = rest.join(':');
		if (type === 'CMD') {
			if (payload === 'sw_frlg') { setActiveGame('frlg'); setThemeKey(GAME_DEFAULT_THEME['frlg']); }
			if (payload === 'sw_rs') { setActiveGame('rs'); setThemeKey(GAME_DEFAULT_THEME['rs']); }
			if (payload === 'sw_em') { setActiveGame('emerald'); setThemeKey(GAME_DEFAULT_THEME['emerald']); }
			if (payload.startsWith('theme_')) { setThemeKey(payload.replace('theme_', '')); }
			if (payload === 'quit') exit();
			setQuery(''); setIsFocused(true); return;
		}
		if (type === 'PKM') { const p = data.pokemonListArray.find(x => x.id === parseInt(payload)); pushHistory('POKEMON', p); }
		if (type === 'RTE') pushHistory('ROUTE', payload);
		if (type === 'STA') pushHistory('STAT', { stat: payload, groupBy: 'pokemon' });
	};

	// ──────────────────────────────────────────────────────────
	//  SHARED THEMED SELECT BOX
	// ──────────────────────────────────────────────────────────
	// chromeRows = total rows consumed by fixed UI elements in the current view
	// Default 18 is safe for most detail views (header 3 + breadcrumb 2 + info box 4 + footer 3 + margins 4 + list border 2)
	const ThemedSelect = ({ items, initialIndex, onSelect, onHighlight, chromeRows = 18 }) => {
		useEffect(() => {
			activeItemsRef.current = items;
			activeOnSelectRef.current = onSelect;
		}, [items, onSelect]);

		const listLimit = Math.max(3, dims.r - chromeRows);

		return (
			<Box borderStyle="round" borderColor={t.border} paddingX={1} flexGrow={1}>
				<SelectInput
					key={items.map(x => x.value).join('|')}
					items={items}
					limit={listLimit}
					initialIndex={clampedIndex(initialIndex, items)}
					onSelect={onSelect}
					onHighlight={onHighlight ? (i => onHighlight(i, items)) : (i => trackHighlight(i, items))}
					indicatorComponent={Indicator}
					itemComponent={Item}
				/>
			</Box>
		);
	};

	// ── Sort bar component ──
	const SortBar = ({ sortMode }) => (
		<Box marginLeft={1} marginBottom={1}>
			<Text color={t.muted}>Sort by ↓  </Text>
			{SORT_MODES.map((sm, i) => (
				<Box key={sm} marginRight={1}>
					<Text
						color={sm === sortMode ? t.accent : t.muted}
						inverse={sm === sortMode}
						bold={sm === sortMode}
					>
						{` ${SORT_LABELS[sm]} `}
					</Text>
				</Box>
			))}
		</Box>
	);

	// ── Sort helper ──
	const pkmSortFn = (aP, bP, aEncs, bEncs, mode) => {
		if (mode === 'yield') {
			const aEV = aP.yields.reduce((s, y) => s + y.effort, 0);
			const bEV = bP.yields.reduce((s, y) => s + y.effort, 0);
			return bEV - aEV || aP.dexNumber - bP.dexNumber;
		}
		if (mode === 'common') {
			const aMax = aEncs ? Math.max(...aEncs.map(e => e.rarity || 0)) : 0;
			const bMax = bEncs ? Math.max(...bEncs.map(e => e.rarity || 0)) : 0;
			return bMax - aMax || aP.dexNumber - bP.dexNumber;
		}
		return aP.dexNumber - bP.dexNumber;
	};

	// ──────────────────────────────────────────────────────────
	//  DETAIL VIEWS
	// ──────────────────────────────────────────────────────────
	const renderDetail = () => {
		if (currentView.type === 'POKEMON') {
			const p = currentView.value;
			const encounters = data.encounters.filter(e => e.id === p.id);
			const locMap = new Map();
			encounters.forEach(e => { if (!locMap.has(e.location)) locMap.set(e.location, []); locMap.get(e.location).push(e); });
			const items = Array.from(locMap.entries())
				.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }))
				.map(([loc, encs]) => {
					const m = [...new Set(encs.map(e => e.method))].join(', ');
					return { label: `  ${loc.padEnd(30)} ${m}`, value: loc };
				});
			return (
				<Box flexDirection="column" flexGrow={1}>
					<Box borderStyle="round" borderColor={t.accent} paddingX={2} flexDirection="column">
						<Box>
							<Text bold color={t.text}>{p.name}</Text>
							{p.dexNumber < 9999 && <Text color={t.muted}> · #{String(p.dexNumber).padStart(3, '0')}</Text>}
						</Box>
						<Box marginTop={1}>
							{p.yields.map(y => (
								<Box key={y.stat} marginRight={3}>
									<Text color={t.statColors[y.stat] || t.accent}>+{y.effort} {y.stat.toUpperCase()}</Text>
								</Box>
							))}
						</Box>
					</Box>
					<Box marginTop={1} marginLeft={1}><Text color={t.muted}>{items.length} location{items.length !== 1 ? 's' : ''} — enter to view route</Text></Box>
					{items.length > 0
						? <Box marginTop={1} flexGrow={1}><ThemedSelect items={items} initialIndex={currentView.cursorIndex} onSelect={i => pushHistory('ROUTE', i.value)} chromeRows={22} /></Box>
						: <Box marginTop={1} marginLeft={1}><Text color="red">No wild encounters in {GAME_LABELS[activeGame]}.</Text></Box>
					}
				</Box>
			);
		}

		if (currentView.type === 'ROUTE') {
			const loc = currentView.value;
			const sortMode = currentView.sortMode || 'yield';
			const encs = data.encounters.filter(e => e.location === loc);
			const byPkm = [...new Set(encs.map(e => e.id))].map(id => ({
				p: data.pokemonListArray.find(x => x.id === id),
				pe: encs.filter(e => e.id === id),
			}))
				.filter(x => x.p)
				.sort((a, b) => pkmSortFn(a.p, b.p, a.pe, b.pe, sortMode));

			const items = byPkm.map(x => {
				const m = [...new Set(x.pe.map(e => e.method))].join(', ');
				const ev = x.p.yields.map(y => `+${y.effort} ${y.stat.toUpperCase().slice(0, 3)}`).join(' ');
				return { label: `  ${x.p.name.padEnd(16)} ${ev.padEnd(20)} ${m}`, value: String(x.p.id) };
			});
			return (
				<Box flexDirection="column" flexGrow={1}>
					<Box borderStyle="round" borderColor={t.accent2} paddingX={2} flexDirection="column">
						<Text bold color={t.text}>{loc}</Text>
						<Text color={t.muted}>{items.length} pokemon available</Text>
					</Box>
					<SortBar sortMode={sortMode} />
					<Box marginTop={0} flexGrow={1}>
						<ThemedSelect items={items} initialIndex={currentView.cursorIndex} chromeRows={21}
							onSelect={i => { const p = data.pokemonListArray.find(x => x.id === parseInt(i.value)); pushHistory('POKEMON', p); }} />
					</Box>
				</Box>
			);
		}

		if (currentView.type === 'STAT') {
			const stat = currentView.value.stat;
			const groupBy = currentView.value.groupBy || 'pokemon';
			const statColor = t.statColors[stat] || t.accent;
			const encs = data.encounters.filter(e => e.yields.some(y => y.stat === stat));

			const sortMode = currentView.sortMode || 'yield';

			if (groupBy === 'pokemon') {
				const m = new Map();
				encs.forEach(e => {
					if (!m.has(e.id)) {
						const p = data.pokemonListArray.find(x => x.id === e.id);
						if (p) {
							const y = p.yields.find(y => y.stat === stat);
							m.set(e.id, { p, effort: y ? y.effort : 0, best: e.rarity, locs: new Set([e.location]) });
						}
					} else {
						if (e.rarity > m.get(e.id).best) m.get(e.id).best = e.rarity;
						m.get(e.id).locs.add(e.location);
					}
				});
				const sortedArr = Array.from(m.values());
				if (sortMode === 'yield') sortedArr.sort((a, b) => b.effort - a.effort || b.best - a.best || a.p.name.localeCompare(b.p.name));
				else if (sortMode === 'common') sortedArr.sort((a, b) => b.best - a.best || b.effort - a.effort || a.p.name.localeCompare(b.p.name));
				else sortedArr.sort((a, b) => a.p.dexNumber - b.p.dexNumber);
				const items = [
					{ label: '  [switch to: group by location]', value: 'switch_to_location' },
					...sortedArr.map(x => {
						const locArr = Array.from(x.locs);
						let locStr = locArr.slice(0, 2).join(', ');
						if (locArr.length > 2) locStr += ` (+${locArr.length - 2} more)`;
						return { label: `  +${x.effort}  ${x.p.name.padEnd(16)} ${locStr}`, value: `pkm:${x.p.id}` };
					})
				];
				return (
					<Box flexDirection="column" flexGrow={1}>
						<Box borderStyle="round" borderColor={statColor} paddingX={2} flexDirection="column">
							<Text bold color={statColor}>{stat.toUpperCase()}</Text>
							<Text color={t.muted}>Pokémon yielding {stat.toUpperCase()} EVs · {sortedArr.length} results</Text>
						</Box>
						<SortBar sortMode={sortMode} />
						<Box marginTop={0} flexGrow={1}>
							<ThemedSelect items={items} initialIndex={currentView.cursorIndex} chromeRows={21}
								onSelect={i => {
									if (i.value === 'switch_to_location') { popHistory(); pushHistory('STAT', { stat, groupBy: 'location' }); }
									else { const id = parseInt(i.value.split(':')[1]); pushHistory('POKEMON', data.pokemonListArray.find(x => x.id === id)); }
								}} />
						</Box>
					</Box>
				);
			} else {
				const routeMap = new Map();
				encs.forEach(e => {
					if (!routeMap.has(e.location)) routeMap.set(e.location, { loc: e.location, encounters: [], best: 0 });
					const group = routeMap.get(e.location);
					const p = data.pokemonListArray.find(x => x.id === e.id);
					if (p) {
						const y = p.yields.find(y => y.stat === stat);
						if (y) {
							group.encounters.push({ p, effort: y.effort, rarity: e.rarity, method: e.method });
							if (e.rarity > group.best) group.best = e.rarity;
						}
					}
				});

				const sortedGroups = Array.from(routeMap.values()).sort((a, b) => b.best - a.best || a.loc.localeCompare(b.loc, undefined, { numeric: true, sensitivity: 'base' }));
				const items = [
					{ label: '  [switch to: group by pokemon]', value: 'switch_to_pokemon' }
				];

				sortedGroups.forEach(g => {
					items.push({
						label: `╭── ${g.loc} `,
						value: `route:${g.loc}`
					});

					const pkmMap = new Map();
					g.encounters.forEach(e => {
						if (!pkmMap.has(e.p.id)) pkmMap.set(e.p.id, { p: e.p, effort: e.effort, methods: new Set() });
						pkmMap.get(e.p.id).methods.add(e.method);
					});

					const sortedEncounters = Array.from(pkmMap.values());
					if (sortMode === 'yield') sortedEncounters.sort((a, b) => b.effort - a.effort || a.p.dexNumber - b.p.dexNumber);
					else if (sortMode === 'common') {
						// Sort by max rarity within this group
						const rarityOf = (pId) => Math.max(...g.encounters.filter(e => e.p.id === pId).map(e => e.rarity || 0));
						sortedEncounters.sort((a, b) => rarityOf(b.p.id) - rarityOf(a.p.id) || a.p.dexNumber - b.p.dexNumber);
					}
					else sortedEncounters.sort((a, b) => a.p.dexNumber - b.p.dexNumber);
					sortedEncounters.forEach((e, i, arr) => {
						const isLast = i === arr.length - 1;
						const prefix = isLast ? '╰──' : '├──';
						const methodStr = Array.from(e.methods).join(', ');
						items.push({
							label: `${prefix} +${e.effort} ${e.p.name.padEnd(16)} (${methodStr})`,
							value: `pkm:${e.p.id}:${g.loc}`
						});
					});
				});

				return (
					<Box flexDirection="column" flexGrow={1}>
						<Box borderStyle="round" borderColor={statColor} paddingX={2} flexDirection="column">
							<Text bold color={statColor}>{stat.toUpperCase()}</Text>
							<Text color={t.muted}>Locations with Pokémon yielding {stat.toUpperCase()} EVs · {sortedGroups.length} routes</Text>
						</Box>
						<SortBar sortMode={sortMode} />
						<Box marginTop={0} flexGrow={1}>
							<ThemedSelect items={items} initialIndex={currentView.cursorIndex} chromeRows={21}
								onSelect={i => {
									const parts = i.value.split(':');
									if (parts[0] === 'switch_to_pokemon') { popHistory(); pushHistory('STAT', { stat, groupBy: 'pokemon' }); }
									else if (parts[0] === 'route') pushHistory('ROUTE', parts.slice(1).join(':'));
									else if (parts[0] === 'pkm') {
										const p = data.pokemonListArray.find(x => x.id === parseInt(parts[1]));
										if (p) pushHistory('POKEMON', p);
									}
								}} />
						</Box>
					</Box>
				);
			}
		}
	};

	// ──────────────────────────────────────────────────────────
	//  DASHBOARD
	// ──────────────────────────────────────────────────────────
	const renderDashboard = () => (
		<Box flexDirection="column" flexGrow={1}>
			<Box marginBottom={1}>
				{MODES.map((m, i) => (
					<Box key={m} marginRight={2}>
						<Text color={i === modeIndex ? t.accent : t.muted} bold={i === modeIndex}>
							{i === modeIndex ? '▸ ' : '  '}{m}
						</Text>
					</Box>
				))}
				{displayList.length > 0 && <Text color={t.muted}> ({displayList.length})</Text>}
			</Box>
			<Box borderStyle="round" borderColor={isFocused ? t.borderFocus : t.border} paddingX={2}>
				<Text color={t.accent}>❯ </Text>
				<TextInput
					key={`search-${activeMode}-${searchKey}`}
					value={query}
					onChange={v => {
						setQuery(v);
						setIsFocused(true);
						dashCursorRef.current = 0;
					}}
					focus={isFocused}
					placeholder={`search ${activeMode}...`}
				/>
			</Box>
			{query && displayList.length === 0 && (
				<Box marginTop={1} marginLeft={2}><Text color={t.muted}>No matches found.</Text></Box>
			)}
			{displayList.length > 0 && (
				<Box flexDirection="column" marginTop={1} flexGrow={1}>
					<Box borderStyle="round" borderColor={t.border} paddingX={1} flexGrow={1}>
						<SelectInput
							key={displayList.map(x => x.value).join('|')}
							items={displayList}
							initialIndex={clampedIndex(dashCursorRef.current, displayList)}
							limit={Math.max(3, dims.r - 16)}
							onSelect={(item) => {
								activeOnSelectRef.current = handleSelect;
								handleSelect(item);
							}}
							isFocused={!isFocused}
							onHighlight={i => {
								activeItemsRef.current = displayList;
								activeOnSelectRef.current = handleSelect;
								trackHighlight(i, displayList);
							}}
							indicatorComponent={Indicator}
							itemComponent={Item}
						/>
					</Box>
				</Box>
			)}
		</Box>
	);

	// ──────────────────────────────────────────────────────────
	//  ROOT LAYOUT
	// ──────────────────────────────────────────────────────────
	return (
		<Box width={dims.c} height={dims.r} flexDirection="column" paddingX={1}>
			{/* Header */}
			<Box flexShrink={0} justifyContent="space-between" paddingX={1} borderStyle="round" borderColor={t.border}>
				<Box>
					<Text bold color={t.accent}>ev-helper</Text>
					<Text color={t.muted}> · {GAME_LABELS[activeGame]}</Text>
				</Box>
				{loading
					? <Text color={t.accent2}>{loadFrame} syncing</Text>
					: <Text color={t.success}>● connected</Text>
				}
			</Box>

			{/* Breadcrumb */}
			{currentView && (
				<Box paddingX={1} marginTop={1} flexShrink={0}>
					{crumbs.map((c, i) => (
						<Text key={i}>
							{i > 0 && <Text color={t.muted}> › </Text>}
							<Text color={i === crumbs.length - 1 ? t.text : t.muted} bold={i === crumbs.length - 1}>{c}</Text>
						</Text>
					))}
				</Box>
			)}

			{/* Body */}
			<Box flexDirection="column" flexGrow={1} paddingX={1} marginTop={1} marginBottom={1}>
				{loading ? (
					<Box flexDirection="column">
						<Text color={t.accent2}>{loadFrame} Fetching data from PokeAPI...</Text>
						<Text color={t.muted}>First launch may take a moment.</Text>
					</Box>
				) : (currentView ? renderDetail() : renderDashboard())}
			</Box>

			{/* Footer */}
			<Box flexShrink={0} justifyContent="space-between" paddingX={1} borderStyle="round" borderColor={t.border}>
				{currentView ? (
					<Text color={t.muted} wrap="truncate-end">
						<Text color={t.accent}>enter</Text> select  <Text color={t.accent}>esc</Text> back  {(currentView.type === 'ROUTE' || currentView.type === 'STAT') && <><Text color={t.accent}>tab</Text> sort  </>}<Text color={t.accent}>^s</Text> new term  <Text color={t.accent}>^n</Text> home
					</Text>
				) : (
					<Text color={t.muted} wrap="truncate-end">
						<Text color={t.accent}>tab</Text> mode  <Text color={t.accent}>↓/enter</Text> select  {!isFocused && <><Text color={t.accent}>^s</Text> new term  </>}<Text color={t.accent}>/</Text> cmds  <Text color={t.accent}>esc</Text> quit
					</Text>
				)}
				<Text color={t.accent2} flexShrink={0}> {t.name}</Text>
			</Box>
		</Box>
	);
}
