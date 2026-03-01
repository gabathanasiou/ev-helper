#!/usr/bin/env node
/**
 * scripts/build-sea.mjs
 *
 * Packages bundle.mjs into a Node.js Single Executable Application (SEA).
 * Node.js SEA natively supports ESM + top-level await, so this works with Ink
 * and yoga-wasm-web out of the box.
 *
 * Requirements: Node.js >= 18.16.0 (SEA was experimental then, stable in v20+)
 * Run from cli-app/:  node scripts/build-sea.mjs
 *
 * Produces:  bin/ev-helper  (or bin/ev-helper.exe on Windows)
 */

import { execSync } from 'child_process';
import { existsSync, copyFileSync, writeFileSync, readFileSync } from 'fs';
import { platform } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const isWin = platform() === 'win32';
const isMac = platform() === 'darwin';
const outputName = isWin ? 'ev-helper.exe' : 'ev-helper';
const outputPath = join(root, 'bin', outputName);

// ── 1. Write SEA config ───────────────────────────────────────────────────────
const seaConfig = {
    main: join(root, 'bundle.mjs'),
    output: join(root, 'sea-prep.blob'),
    disableExperimentalSEAWarning: true,
    useSnapshot: false,
    useCodeCache: false,
};

const configPath = join(root, 'sea-config.json');
writeFileSync(configPath, JSON.stringify(seaConfig, null, 2));
console.log('📝  sea-config.json written');

// ── 2. Generate the SEA blob ──────────────────────────────────────────────────
console.log('🔧  Generating SEA blob...');
execSync('node --experimental-sea-config sea-config.json', {
    cwd: root,
    stdio: 'inherit',
});

// ── 3. Copy the node binary as the base executable ───────────────────────────
console.log(`📦  Copying node binary to bin/${outputName}...`);
const nodeBin = process.execPath;

// Ensure bin/ exists
execSync(`mkdir -p "${join(root, 'bin')}"`);
// Use shell cp (avoids EACCES with Homebrew's read-protected node binary)
execSync(`cp "${nodeBin}" "${outputPath}"`);
// Make it writable + executable so postject can modify it
execSync(`chmod 755 "${outputPath}"`);

// ── 4. Remove existing signature (macOS) ─────────────────────────────────────
if (isMac) {
    console.log('🔏  Removing existing code signature (macOS)...');
    try {
        execSync(`codesign --remove-signature "${outputPath}"`, { stdio: 'inherit' });
    } catch {
        // May fail if not signed — that's fine
    }
}

// ── 5. Inject the SEA blob ───────────────────────────────────────────────────
console.log('💉  Injecting SEA blob...');
const blobPath = join(root, 'sea-prep.blob');
const injectCmd = isWin
    ? `npx postject "${outputPath}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`
    : isMac
        ? `npx postject "${outputPath}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA`
        : `npx postject "${outputPath}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;

execSync(injectCmd, { cwd: root, stdio: 'inherit' });

// ── 6. Re-sign (macOS) ───────────────────────────────────────────────────────
if (isMac) {
    console.log('🔏  Re-signing binary (macOS ad-hoc)...');
    try {
        execSync(`codesign --sign - "${outputPath}"`, { stdio: 'inherit' });
    } catch {
        console.warn('⚠️  Code signing failed (optional, app will still run)');
    }
}

console.log(`\n✅  Binary ready: bin/${outputName}\n`);
console.log(`   Try it: ./bin/${outputName} --help\n`);
