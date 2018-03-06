import { join } from 'path';
import fs from 'fs-extra';
import * as babel from 'babel-core';
import ora from 'ora';

export default function transpile(file, initial) {
	return new Promise((resolve, reject) => {
		const cwd = process.cwd();
		const filename = file.replace(cwd, '');
		const spinner = initial ? null : ora(`Processing ${filename}`).start();

		babel.transformFile(
			file,
			{
				sourceMaps: 'inline',
				babelrc: false,
				presets: [join(__dirname, '../../babel.js')],
			},
			async (err, { code }) => {
				if (err) reject(err);
				const pathArray = file.split('/');
				pathArray.pop();
				const fileDir = pathArray.join('/').replace(cwd, '');

				await fs.ensureDir(`${cwd}/.expressx/build${fileDir}`);
				await fs.writeFile(`${cwd}/.expressx/build${file.replace(cwd, '')}`, code);
				if (!initial) spinner.stop();

				resolve();
			},
		);
	});
}
