import cli from 'commander';
import chalk from 'chalk';
import packageJson from '../package.json';
import init from './init';
import serve from './lib/serve';
import build from './lib/build';
import { clear } from './lib/utils';
import { startCommand } from './lib/start-process';

cli
	.version(packageJson.version)
	.description('Smooth developer experience for Express.js')
	.option('--debug', 'Run with Node debugger attached')
	.usage('[commands] [-options]');

cli
	.command('init')
	.option('--flow', 'Include Flow in dependencies')
	.description('Set up new ExpressX application')
	.action(init);

cli
	.command('build')
	.description('Set up new ExpressX application')
	.action(build);

cli
	.command('start')
	.description('Start application')
	.option('--debug', 'Run with Node debugger attached')
	.action(startCommand);

cli.parse(process.argv);

if (cli.args.length === 0) {
	clear();
	try {
		serve(cli);
	} catch (e) {
		console.error(
			chalk.bgRed.black(' ERROR '),
			chalk.red("Something went sideways and we didn't expect it. Here's what happened:"),
		);
		console.error(e);
	}
}
