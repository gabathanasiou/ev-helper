#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
	`
		Usage
		  $ ev-helper

		Options
			--pokemon  Search a specific pokemon
			--route    Search a specific route
			--stat     Search a specific stat

		Examples
		  $ ev-helper --pokemon=Pikachu
	`,
	{
		importMeta: import.meta,
	},
);

const initialMode = cli.flags.route ? 'ROUTE' : (cli.flags.stat ? 'STAT' : 'POKEMON');
const initialQuery = cli.flags.pokemon || cli.flags.route || cli.flags.stat || '';

// Enter alternate screen buffer for full-screen hacker feel
process.stdout.write('\x1b[?1049h');
process.on('exit', () => {
	process.stdout.write('\x1b[?1049l');
});

const { waitUntilExit } = render(<App game="frlg" initialMode={initialMode} initialQuery={initialQuery} />);

waitUntilExit().then(() => {
	process.exit(0);
});
