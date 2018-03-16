import { join } from 'path';
import fs from 'fs-extra';
import { spawn } from 'cross-spawn';
import ora from 'ora';
import ls from 'log-symbols';
import chalk from 'chalk';

const cwd = process.cwd();

export default async function init() {
	const spinner = ora('Setting up your new ExpressX project...').start();
	await fs.copy(join(__dirname, '../../src/init/template'), join(cwd, '.'));
	spinner.text = 'Installing dependencies...';
	const proc = spawn('npm', ['install']);
	proc.on('exit', (code) => {
		if (code === 0) {
			spinner.stop();
			console.log();
			console.log(ls.success, chalk.green('Woohoo! Everything is good to go!'));
			console.log('To start your app, just run:');
			console.log();
			console.log(chalk.cyan('    npm start'));
			console.log();
			console.log('Happy coding!');
			process.exit(); // eslint-disable-line unicorn/no-process-exit
		} else {
			spinner.fail('There was an error installing dependencies.');
		}
	});
}
