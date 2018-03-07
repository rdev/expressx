import cli from 'commander';
import clear from 'clear';
import ls from 'log-symbols';
import chalk from 'chalk';
import packageJson from '../package.json';
import serve from './lib/serve';

cli
	.version(packageJson.version)
	.description('Smooth developer experience for Express.js')
	.usage('[commands] [-options]');

cli.parse(process.argv);

clear();
try {
	serve(cli);
} catch (e) {
	console.error(
		ls.error,
		chalk.red("Something went sideways and we didn't expect it. Here's what happened:"),
	);
	console.error(e);
}
