/**
 * build.mjs
 *
 * Bundles the CLI into a single self-contained CJS file.
 *
 * Two compatibility fixes applied:
 *
 * 1. yoga-wasm-web/auto  → aliased to yoga-wasm-web/asm
 *    The "auto" entry uses WebAssembly + top-level await (ESM-only).
 *    The "asm" entry is a pure JavaScript fallback — no async, no WASM,
 *    fully CJS-compatible. It's slightly larger but identical behavior.
 *
 * 2. Ink's reconciler.js → devtools block stripped
 *    reconciler.js has `if (DEV) { await import('./devtools.js') }` which
 *    is an ESM-only construct. We remove it since it's a dev-only code path.
 *
 * Run: node build.mjs
 */

import { build } from 'esbuild';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Babel outputs .mjs locally (Node 25) but .js on CI (Node 20) — detect at runtime
const ext = existsSync('dist/cli.mjs') ? 'mjs' : 'js';

// ── Plugin: patch cli.mjs — replace import.meta with synthetic object ────────
// meow requires importMeta.url to find the package directory. When bundled as
// CJS, import.meta is empty. We replace it with a stable path pointing to where
// pkg's virtual snapshot stores the bundle so meow can resolve paths correctly.
const patchCliMeta = {
    name: 'patch-cli-meta',
    setup(pluginBuild) {
        pluginBuild.onLoad(
            { filter: /dist[/\\]cli\.(m)?js$/ },
            (args) => {
                let src = readFileSync(args.path, 'utf8');
                // Replace `importMeta: import.meta` with a synthetic object
                src = src.replace(
                    'importMeta: import.meta',
                    'importMeta: { url: "file:///snapshot/ev-helper/bundle.cjs" }',
                );
                return { contents: src, loader: 'js' };
            },
        );
    },
};

// ── Plugin: alias yoga/auto → yoga/asm + strip Ink devtools ─────────────────
const compatPlugin = {
    name: 'compat',
    setup(pluginBuild) {
        // Redirect yoga-wasm-web/auto to the sync ASM version
        pluginBuild.onResolve({ filter: /^yoga-wasm-web\/auto$/ }, () => ({
            path: resolve(__dirname, 'node_modules/yoga-wasm-web/dist/asm.js'),
        }));

        // Patch Ink reconciler: remove the top-level-await devtools block
        pluginBuild.onLoad(
            { filter: /ink[/\\]build[/\\]reconciler\.js$/ },
            (args) => {
                let src = readFileSync(args.path, 'utf8');
                src = src.replace(
                    /if\s*\(process\.env\[['"]DEV['"]\]\s*===\s*['"]true['"]\)\s*\{[\s\S]*?(?=const diff)/,
                    '/* devtools removed for binary build */\n',
                );
                return { contents: src, loader: 'js' };
            },
        );

        // Stub devtools.js completely
        pluginBuild.onResolve({ filter: /[/\\]devtools\.js$/ }, () => ({
            path: 'devtools-stub',
            namespace: 'stub-ns',
        }));
        pluginBuild.onLoad({ filter: /.*/, namespace: 'stub-ns' }, () => ({
            contents: 'export default {};',
            loader: 'js',
        }));
    },
};

// ── Bundle ───────────────────────────────────────────────────────────────────
await build({
    entryPoints: [`dist/cli.${ext}`],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: 'bundle.cjs',
    plugins: [patchCliMeta, compatPlugin],
    external: [
        'react-devtools-core',
    ],
    logLevel: 'info',
    treeShaking: true,
    target: 'node18',
    define: {
        // Give meow a stable path for import.meta.url inside the snapshot
        'import.meta.url': '"file:///snapshot/ev-helper/bundle.cjs"',
    },
});

console.log('\n✅  bundle.cjs written — run `npm run build:binary` next.\n');
