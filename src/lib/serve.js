import { join } from 'path';
import { spawn } from 'cross-spawn';
import glob from 'glob';
import watchman from 'fb-watchman';
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

function cleanupStatic() {
	return new Promise((resolve, reject) => {
		glob(join(cwd, '.expressx/**/*.scss'), async (err, files) => {
			// eslint-disable-next-line promise/no-promise-in-callback
			await Promise.all(files.map(async (file) => {
				try {
					await fs.remove(file);
				} catch (e) {
					reject(e);
				}
			}));
			resolve();
		});
	});
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
	const jsGlobs = [
		'**/*.js',
		// hbs, scss
		`!${config.staticFolder}/*.js`,
		`!${config.staticFolder}/**/*.js`,
		'!node_modules/**',
		'!dist/**',
		'!.expressx/**',
		'!flow-typed/**',
		'!__tests__/**',
		'!**/*.test.js',
		'!coverage/**',
		'!**/*.config.js',
		...config.watchmanIgnore.map(g => `!${g}`),
	];

	const spinner = ora('Warming up...').start();

	// Remove previous build completely before production build
	if (process.env.NODE_ENV === 'production') {
		del(join(cwd, '.expressx/build'));
	}

	// Initial transpile and setup
	try {
		await initialTranspile();
	} catch (e) {
		spinner.stop();
		console.error(ls.error, chalk.red('Babel encountered an error:'));
		console.log(e.codeFrame || e);
	}

	let ignoredFiles = [];
	if (process.env.NODE_ENV !== 'production' && config.babel.ignore.length > 0) {
		spinner.text = 'This might take a few moments...';
		config.babel.ignore.forEach((g) => {
			ignoredFiles = [...ignoredFiles, ...glob.sync(join(cwd, g))];
		});
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
	await cleanupStatic();

	// Start process and stop the spinner
	let proc = startProcess();
	spinner.stop();

	let webpackEntries = [];

	// // File change handler
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
		if (file.includes('.hbs')) {
			if (file.includes(config.hbs.partials)) {
				clear();
				proc.removeAllListeners('close');
				proc.kill();
				proc = startProcess();
			} else {
				refresh();
			}
		}
		if (file.includes('.js') || file.includes('.jsx')) {
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
			} else if (!ignoredFiles.includes(join(cwd, file))) {
				clear();
				try {
					//                                    This is dirty -_-
					await transpile(join(cwd, file.replace(cwd.split('/')[cwd.split('/').length - 1], '')));
					proc.removeAllListeners('close');
					proc.kill();
					proc = startProcess();
				} catch (e) {
					console.error(ls.error, chalk.red('Babel encountered an error:'));
					console.log(e.codeFrame || e);
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

		const client = new watchman.Client();
		client.capabilityCheck({ optional: [], required: ['relative_root'] }, (error) => {
			if (error) {
				console.log(error);
				client.end();
				return;
			}

			// Initiate the watch
			client.command(['watch-project', cwd], (err, res) => {
				if (err) {
					console.error('Error initiating watch:', err);
					return;
				}

				if ('warning' in res) {
					console.log('warning: ', res.warning);
				}

				const jsSub = {
					expression: [
						'allof',
						...jsGlobs.map(watchglob =>
							(watchglob.includes('!')
								? ['not', ['match', watchglob.replace('!', ''), 'wholename']]
								: ['match', watchglob, 'wholename'])),
					],
					fields: ['name', 'size', 'mtime_ms', 'exists', 'type'],
				};
				const hbsSub = {
					expression: [
						'anyof',
						['match', `${config.hbs.views}/*.hbs`, 'wholename'],
						['match', `${config.hbs.views}/**/*.hbs`, 'wholename'],
					],
					fields: ['name', 'size', 'mtime_ms', 'exists', 'type'],
				};
				const scssSub = {
					expression: [
						'anyof',
						['match', '*.scss', 'wholename'],
						['match', '**/*.scss', 'wholename'],
					],
					fields: ['name', 'size', 'mtime_ms', 'exists', 'type'],
				};

				client.command(['subscribe', res.watch, 'expressx:js', jsSub], (e) => {
					if (e) {
						console.error('failed to subscribe: ', e);
					}
				});
				client.command(['subscribe', res.watch, 'expressx:hbs', hbsSub], (e) => {
					if (e) {
						console.error('failed to subscribe: ', e);
					}
				});
				client.command(['subscribe', res.watch, 'expressx:scss', scssSub], (e) => {
					if (e) {
						console.error('failed to subscribe: ', e);
					}
				});

				client.on('subscription', (resp) => {
					if (!resp.is_fresh_instance) {
						resp.files.forEach((file) => {
							handleWatchFile(file.name);
						});
					}
				});
			});
		});
	}
}
