import { join } from 'path';
import { spawn } from 'cross-spawn';
import glob from 'glob';
import { globwatcher } from 'globwatcher';
import fs from 'fs-extra';
import ls from 'log-symbols';
import chalk from 'chalk';
import ora from 'ora';
import clear from 'clear';
import del from 'del';
import refresh from './livereload';
import transpile from './transpile';
import postcss from './postcss';
import webpack, { webpackConfig } from './webpack';
import config from './config';

/* eslint-disable global-require, import/no-dynamic-require, security/detect-non-literal-require */
const cwd = process.cwd();

/**
 * Perform initial transpilation
 *
 * @returns {Promise}
 */
function initialTranspile() {
	return new Promise((resolve, reject) => {
		glob(
			join(cwd, '**/*.js'),
			{
				ignore: [
					join(cwd, 'node_modules/**/*.js'),
					join(cwd, 'dist/**/*.js'),
					join(cwd, `${config.staticFolder}/**/*.js`),
					join(cwd, '.expressx/**/*.js'),
					join(cwd, 'expressx.config.js'),
					join(cwd, 'flow-typed/**/*.js'),
					join(cwd, '**/__tests__/**/*.js'),
					join(cwd, '**/coverage/**/*.js'),
					...config.babel.ignore.map(g => join(cwd, g)),
				],
			},
			async (err, files) => {
				if (err) {
					console.error(
						ls.error,
						chalk.red("Oops, a weird error just happened and we weren't prepared for it:\n"),
						err,
					);
					reject();
				} else {
					// Basically async forEach before resolving
					// eslint-disable-next-line promise/no-promise-in-callback
					await Promise.all(files.map(async (file) => {
						try {
							await transpile(file, true);
						} catch (e) {
							reject(e);
						}
					}));
					resolve();
				}
			},
		);
	});
}

/* eslint-disable unicorn/no-process-exit */

/**
 * Spawn child process with a server
 *
 * @returns {ChildProcess}
 */
function startProcess() {
	const bin = join(__dirname, '../../bin/start-server');
	const proc = spawn('node', [bin], {
		stdio: ['inherit', 'inherit', 'inherit', 'ipc'], // IPC to know when server is done spinning up
		customFds: [0, 1, 2],
	});

	proc.on('close', (code, signal) => {
		if (code !== null) {
			process.exit(code);
		}
		if (signal) {
			if (signal === 'SIGKILL') {
				process.exit(137);
			}
			console.log(`got signal ${signal}, exiting`);
			process.exit(1);
		}
		process.exit(0);
	});

	proc.on('error', (err) => {
		console.error(err);
		process.exit(1);
	});

	proc.on('message', (message) => {
		if (message === 'EXPRESSX:READY') {
			refresh(); // Refresh when server is done spinning up
		}
	});

	return proc;
}

/**
 * Check if watched file is designated for webpack
 *
 * @param {string} file - Flie path
 * @param {string} webpackEntries - Webpack paths
 * @returns {boolean}
 */
function checkWebpackPaths(file, webpackEntries) {
	let includes = false;
	webpackEntries.forEach((entry) => {
		const compare = Array.isArray(entry) ? entry[0] : entry;
		if (file.includes(compare.slice(2))) {
			// Trim the ./
			includes = true;
		}
	});

	return includes;
}

/**
 * Handle webpack bundling error
 *
 * @param {any} e - error object
 */
async function handleWebpackError(e) {
	if (e.errors) {
		console.log(chalk.red.bold(`\nWebpack encountered ${chalk.underline(e.errors.length)} error(s):`));
		e.errors.forEach(err => console.error(`\n${ls.error}`, `${err}`));
	} else {
		console.error(ls.error, chalk.red(`\n${e}`));
	}
}

/**
 * Handle PostCSS bundling error
 *
 * @param {any} e - error object
 */
async function handleStylesError(e) {
	console.error(`\n${ls.error}`, chalk.red('Error when processing styles: \n'));
	console.log(e.toString());
}

/**
 * Main function
 *
 * @export
 */
export default async function serve() {
	const spinner = ora('Warming up...').start();

	// Remove previous build completely before production build
	if (process.env.NODE_ENV === 'production') {
		del(join(cwd, '.expressx/build'));
	}

	const watchglobs = [
		'**/*.js',
		'**/*.hbs',
		'**/*.scss',
		`${config.staticFolder}/**/*.*`,
		`!${config.staticFolder}/**/*.js`,
		'!node_modules/**/*.js',
		'!dist/**/*.js',
		'!.expressx/**/*.js',
		'!flow-typed/**/*.js',
		'!**/__tests__/**/*.js',
		'!**/coverage/**/*.js',
		...config.babel.ignore.map(g => `!${g}`),
	];

	// Initial transpile and setup
	try {
		await initialTranspile();
	} catch (e) {
		spinner.stop();
		console.error(ls.error, chalk.red('Babel encountered an error:'));
		console.log(e.codeFrame || e);
	}

	try {
		await postcss();
	} catch (e) {
		handleStylesError(e);
	}
	if (config.webpackMode === 'direct') {
		try {
			if (!config.disableWebpack) await webpack();
		} catch (e) {
			handleWebpackError(e);
		}
	}

	await fs.copy(
		join(cwd, config.staticFolder),
		join(cwd, `.expressx/build/${config.staticFolder}`),
	);

	// Start process and stop the spinner
	let proc = startProcess();
	spinner.stop();

	let webpackEntries = [];

	// File change handler
	async function handleWatchFile(file) {
		if (file.includes('.scss')) {
			try {
				await postcss();
				console.log(chalk.grey('> Styles processed successfully'));
				refresh();
			} catch (e) {
				handleStylesError(e);
			}
		}
		if (file.includes('.js')) {
			if (checkWebpackPaths(file, webpackEntries) && !config.disableWebpack) {
				// If file is designated for webpack
				try {
					const webpackStats = await webpack();
					console.log(chalk.grey(`> Webpack build ${webpackStats.hash} finished in ${
						webpackStats.time
					}ms`));
					refresh();
				} catch (e) {
					handleWebpackError(e);
				}
			} else {
				// If file is server code
				clear();
				try {
					await transpile(file);
					proc.removeAllListeners('close');
					proc.kill();
					proc = startProcess();
				} catch (e) {
					console.error(ls.error, chalk.red('Babel encountered an error:'));
					console.log(e.codeFrame);
				}
			}
		}
	}

	// Set up watchers for development
	if (process.env.NODE_ENV !== 'production') {
		if (typeof webpackConfig.entry === 'string') {
			webpackEntries.push(webpackConfig.entry);
		} else {
			// eslint-disable-next-line security/detect-object-injection
			webpackEntries = Object.keys(webpackConfig.entry).map(key => webpackConfig.entry[key]);
		}

		const watch = globwatcher(watchglobs);
		watch.on('changed', handleWatchFile);
		watch.on('added', handleWatchFile);
		watch.on('deleted', () => refresh());
	}
}
