import { join } from 'path';
import fs from 'fs-extra';
import postCSS from 'postcss';
import autoprefixer from 'autoprefixer';
import sass from '@csstools/postcss-sass';
import cssnano from 'cssnano';
import ora from 'ora';
import config from './config';

const cwd = process.cwd();

/**
 * Compile SASS to CSS
 *
 * @export
 */
export default async function postcss() {
	return new Promise(async (resolve, reject) => {
		const spinner = ora('Processing styles').start();
		const processors = [sass, autoprefixer(config.autoprefixer)];

		// Minify in production
		if (process.env.NODE_ENV === 'production') {
			processors.push(cssnano);
		}

		await fs.ensureDir('.expressx/build/public/styles');

		// Process all files
		await Promise.all(config.styles.map(async (cssPath) => {
			try {
				const css = await fs.readFile(join(cwd, cssPath));
				const result = await postCSS(processors).process(css, {
					from: join(cwd, cssPath),
					to: join(cwd, `.expressx/build/${cssPath.replace('.scss', '')}.css`),
				});

				await fs.writeFile(
					join(cwd, `.expressx/build/${cssPath.replace('.scss', '')}.css`),
					result.css,
				);
				// Write source map in development
				if (result.map && process.env.NODE_ENV !== 'production') {
					await fs.writeFile(
						join(cwd, `.expressx/build/${cssPath.replace('.scss', '')}.css.map`),
						result.map,
					);
				}
			} catch (e) {
				spinner.stop();
				reject(e);
			}
		}));

		// We're done, stop the spinner
		spinner.stop();
		resolve();
	});
}
