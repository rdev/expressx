import { join } from 'path';
import glob from 'glob';
import chokidar from 'chokidar';
import fs from 'fs-extra';
import ls from 'log-symbols';
import chalk from 'chalk';
import ora from 'ora';
import del from 'del';
import startProcess from './start-process';
import refresh from './livereload';
import transpile from './transpile';
import postcss from './postcss';
import webpack, { webpackConfig } from './webpack';
import config from './config';
import { clear } from './utils';

/* eslint-disable global-require, import/no-dynamic-require, security/detect-non-literal-require */
const cwd = process.cwd();

/**
 * Perform initial transpilation
 *
 * @returns {Promise}
 */
export function initialTranspile() {
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
						chalk.bgRed.black(' ERROR '),
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

export function cleanupStatic() {
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

export function copyJsonFiles() {
	return new Promise((resolve, reject) => {
		glob(
			join(cwd, '**/*.json'),
			{
				ignore: [
					join(cwd, 'node_modules/**/*.json'),
					join(cwd, 'coverage/**/*.json'),
					join(cwd, '.expressx/**/*.json'),
					join(cwd, 'jsconfig.json'),
					join(cwd, 'tsconfig.json'),
				],
			},
			async (err, files) => {
				if (err) {
					reject(err);
				} else {
					// Basically async forEach before resolving
					// eslint-disable-next-line promise/no-promise-in-callback
					await Promise.all(files.map(async (file) => {
						try {
							await fs.copy(
								file,
								file.replace(cwd, join(cwd, '.expressx/build')),
							);
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

export function copyCustomAssets() {
	return new Promise(async (resolve) => {
		// eslint-disable-next-line no-restricted-syntax
		for (const copyPath of config.includeInBuild) {
			// eslint-disable-next-line no-await-in-loop
			await fs.copy(join(cwd, copyPath), join(cwd, '.expressx/build', copyPath));
		}
		resolve();
	});
}

/**
 * Handle webpack bundling error
 *
 * @param {any} e - error object
 */
export async function handleWebpackError(e) {
	if (e.errors) {
		console.log(chalk.bgRed.black(' ERROR '), chalk.red.bold(`\nWebpack encountered ${chalk.underline(e.errors.length)} error(s):`));
		e.errors.forEach(err => console.error(`\n${ls.error}`, `${err}`));
	} else {
		console.error(chalk.bgRed.black(' ERROR '), chalk.red(`\n${e}`));
	}
}

/**
 * Handle PostCSS bundling error
 *
 * @param {any} e - error object
 */
export async function handleStylesError(e) {
	console.error(chalk.bgRed.black(' ERROR '), chalk.red('Error when processing styles: \n'));
	console.log(e.toString());
}

/**
 * Handle Babel transpilation error
 *
 * @param {any} e - error object
 */
export async function handleBabelError(e) {
	console.error(chalk.bgRed.black(' ERROR '), chalk.red('Babel encountered an error:'));
	if (e.codeFrame) {
		console.log(chalk.red(e.toString()));
		console.log(e.codeFrame);
	} else {
		console.log(e);
	}
}

/**
 * Main function
 *
 * @export
 */
export default async function serve({ debug }) {
	const ignoreGlobs = [
		join(cwd, `${config.staticFolder}/*.js`),
		join(cwd, `${config.staticFolder}/**/*.js`),
		join(cwd, 'node_modules/**/*.*'),
		join(cwd, 'dist/**'),
		join(cwd, '.expressx/**'),
		join(cwd, 'flow-typed/**'),
		join(cwd, '__tests__/**'),
		join(cwd, '**/*.test.js'),
		join(cwd, 'coverage/**'),
		join(cwd, '**/*.config.js'),
		...config.watchIgnore.map(g => join(cwd, g)),
	];

	clear();
	const spinner = ora('Warming up...').start();

	// Remove previous build completely before production build
	if (process.env.NODE_ENV === 'production') {
		del(join(cwd, '.expressx/build'));
	}

	// Initial transpile and setup
	// @TODO Fully rely on Chokidar for this
	try {
		await initialTranspile();
	} catch (e) {
		spinner.stop();
		handleBabelError(e);
	}

	let ignoredFiles = [];
	if (process.env.NODE_ENV !== 'production' && config.babel.ignore.length > 0) {
		spinner.text = 'This might take a few moments...';
		config.babel.ignore.forEach((g) => {
			ignoredFiles = [...ignoredFiles, ...glob.sync(join(cwd, g))];
		});
	}

	if (!config.disableStyles) {
		try {
			await postcss();
		} catch (e) {
			handleStylesError(e);
		}
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

	await copyJsonFiles();
	await cleanupStatic();
	await copyCustomAssets();

	// Start process and stop the spinner
	let proc = startProcess({ debug });
	spinner.stop();

	let webpackEntries = [];

	// // File change handler
	async function handleWatchFile(file) {
		if (file.includes('.scss') && !config.disableStyles) {
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
				proc = startProcess({ debug });
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
					await transpile(file);
					proc.removeAllListeners('close');
					proc.kill();
					proc = startProcess({ debug });
				} catch (e) {
					handleBabelError(e);
				}
			}

			// If transpilation by Babel is intended for webpack paths
			if (
				checkWebpackPaths(file, webpackEntries) &&
				config.babelIncludeWebpackPaths &&
				!ignoredFiles.includes(join(cwd, file))
			) {
				try {
					//                                    This is dirty -_-
					await transpile(join(cwd, file.replace(cwd.split('/')[cwd.split('/').length - 1], '')));
					proc.removeAllListeners('close');
					proc.kill();
					proc = startProcess({ debug });
				} catch (e) {
					handleBabelError(e);
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

		const watcher = chokidar.watch([
			join(cwd, '**/*.js'),
			join(cwd, '**/*.jsx'),
			join(cwd, '**/*.hbs'),
			join(cwd, '**/*.scss'),
		], {
			ignored: ignoreGlobs,
			ignoreInitial: true,
		});

		watcher.on('all', (event, path) => {
			if (event.includes('unlink')) {
				fs.unlink(path.replace(cwd, `${cwd}/.expressx/build`)); // Clean up in .expressx/build

				proc.removeAllListeners('close');
				proc.kill();
				proc = startProcess({ debug });
				refresh();
			} else {
				handleWatchFile(path);
			}
		});
	}
}
