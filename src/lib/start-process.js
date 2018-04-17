import { join } from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { spawn } from 'cross-spawn';
import refresh from './livereload';
import config from './config';

/* eslint-disable unicorn/no-process-exit */

/**
 * Spawn child process with a server
 *
 * @returns {ChildProcess}
 */
export default function startProcess({ debug }) {
	const bin = join(__dirname, '../../bin/start-server');
	const args = [bin];
	if (debug) {
		args.unshift(`--inspect-brk=0.0.0.0:${config.debugPort || 5858}`);
	}
	const proc = spawn('node', args, {
		stdio: ['inherit', 'inherit', 'inherit', 'ipc'], // IPC to know when server is done spinning up
		customFds: [0, 1, 2],
	});

	proc.on('close', (code, signal) => {
		if (code !== null) {
			// @TODO Close Watch
			if (code === 0) {
				process.exit(0);
			} else {
				console.error(
					chalk.bgRed.black(' ERROR '),
					chalk.red('Server process crashed. Waiting for changes...'),
				);
				console.log(chalk.gray("There's likely an additional logging output above"));
			}
		}
		if (signal) {
			if (signal === 'SIGKILL') {
				process.exit(137);
			}
			console.log(chalk.bgGray.black(' SIG '), `Got signal ${signal}, exiting`);
			process.exit(1);
		}
	});

	proc.on('error', (err) => {
		console.error(chalk.bgRed.black(' ERROR '), chalk.red.bold(err));
	});

	proc.on('message', (message) => {
		if (message === 'EXPRESSX:READY') {
			refresh(); // Refresh when server is done spinning up
		}
	});

	return proc;
}

export function startCommand(cli) {
	if (fs.existsSync(join(process.cwd(), '.expressx/build/app.js'))) {
		startProcess({
			debug: cli.parent.debug,
		});
	} else {
		console.log();
		console.error(chalk.bgRed.black(' ERROR '), chalk.red('Build not found'));
		console.log();
		console.log(`Did you forget to run "${chalk.bold('expressx build')}"?`);
		console.log();
		process.exit(1);
	}
}
