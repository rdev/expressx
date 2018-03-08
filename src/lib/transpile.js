import fs from 'fs-extra';
import * as babel from 'babel-core';
import ora from 'ora';
import config from './config';

/**
 * Transpile file with Babel
 *
 * @export
 * @param {string} file - File path
 * @param {boolean} initial - Initial transpilation flag
 * @returns {Promise}
 */
export default function transpile(file, initial) {
	return new Promise((resolve, reject) => {
		const cwd = process.cwd();
		const filename = file.replace(cwd, '');
		// Show spinner on non-initial transpiles
		const spinner = initial ? null : ora(`Processing ${filename}`).start();

		babel.transformFile(file, config.babel, async (err, result) => {
			if (err) {
				if (!initial) spinner.stop();
				reject(err);
			} else {
				const pathArray = file.split('/');
				pathArray.pop();
				const fileDir = pathArray.join('/').replace(cwd, '');

				await fs.ensureDir(`${cwd}/.expressx/build/${fileDir}`);
				await fs.writeFile(`${cwd}/.expressx/build/${file.replace(cwd, '')}`, result.code);
				if (!initial) spinner.stop();

				resolve();
			}
		});
	});
}
