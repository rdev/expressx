/* eslint-disable unicorn/no-process-exit */
import { join } from 'path';
import glob from 'glob';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import del from 'del';
import postcss from './postcss';
import webpack from './webpack';
import {
	handleBabelError,
	handleStylesError,
	handleWebpackError,
	cleanupStatic,
	initialTranspile,
	copyCustomAssets,
} from './serve';
import config from './config';

const cwd = process.cwd();

export default async function build() {
	const spinner = ora('Commencing build...').start();

	// Remove previous build completely before production build
	if (process.env.NODE_ENV === 'production') {
		del(join(cwd, '.expressx/build'));
	}

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

	await cleanupStatic();
	await copyCustomAssets();

	spinner.stop();
	console.log();
	console.log(chalk.bgGreen.black(' DONE '), chalk.green('Build successful!'));
	console.log();
	console.log(`> Use "${chalk.cyan.bold('expressx start')}" to start the app.`);
	console.log();

	process.exit(0);
}
