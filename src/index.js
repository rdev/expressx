import cli from 'commander';
import packageJson from '../package.json';
import serve from './lib/serve';

cli
	.version(packageJson.version)
	.description('Smooth developer experience for Express.js')
	.usage('[commands] [-options]');

cli.parse(process.argv);

serve(cli);
