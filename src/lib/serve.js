import { join } from 'path';
import { spawn } from 'cross-spawn';
import glob from 'glob';
import { globwatcher } from 'globwatcher';
import ls from 'log-symbols';
import chalk from 'chalk';
import clear from 'clear';
import refresh from './livereload';
import transpile from './transpile';

/* eslint-disable global-require, import/no-dynamic-require, security/detect-non-literal-require */
const cwd = process.cwd();

function initialTranspile() {
	return new Promise((resolve, reject) => {
		glob(
			join(cwd, '/**/*.js'),
			{
				ignore: [
					join(cwd, '/node_modules/**/*.js'),
					join(cwd, '/dist/**/*.js'),
					join(cwd, '/public/**/*.js'),
					join(cwd, '/.expressx/**/*.js'),
				],
			},
			(err, files) => {
				if (err) {
					console.error(
						ls.error,
						chalk.red('Oops, file watcher encountered an error:\n'),
						err,
					);
					reject();
				} else {
					files.forEach((file) => {
						transpile(file, true);
					});
					resolve();
				}
			},
		);
	});
}

/* eslint-disable unicorn/no-process-exit */

function startProcess() {
	const bin = join(__dirname, '../../bin/start-server');
	const proc = spawn('node', [bin], {
		stdio: 'inherit',
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

	return proc;
}

export default async function serve() {
	const watchglobs = [
		'**/*.js',
		'!node_modules/**/*.js',
		'!dist/**/*.js',
		'!public/**/*.js',
		'!.expressx/**/*.js',
	];

	// Initial transpile and setup
	await initialTranspile();
	let proc = startProcess();

	if (!process.env.NODE_ENV === 'production') {
		const watch = globwatcher(watchglobs);
		// const lr = livereload.createServer();

		// @TODO Refactor this
		watch.on('changed', async (file) => {
			clear();
			await transpile(file);
			proc.removeAllListeners('close');
			proc.kill();
			proc = startProcess();
			setTimeout(refresh, 700);
		});
		watch.on('added', async (file) => {
			clear();
			await transpile(file);
			proc.removeAllListeners('close');
			proc.kill();
			proc = startProcess();
			setTimeout(refresh, 700);
		});
	}
}
