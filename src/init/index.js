import { join } from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import ls from 'log-symbols';
import chalk from 'chalk';

const cwd = process.cwd();

export default async function init() {
	const spinner = ora('Setting up your new ExpressX project...').start();
	await fs.copy(join(__dirname, '../../src/init/template'), join(cwd, '.'));
	spinner.stop();
	console.log();
	console.log(ls.success, chalk.green('Woohoo! Everything is good to go!'));
	console.log('To start your app, just run:');
	console.log();
	console.log(chalk.cyan('    npm start'));
	console.log();
	console.log('Happy coding!');
}
