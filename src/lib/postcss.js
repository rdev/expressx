import { join } from 'path';
import fs from 'fs-extra';
import postCSS from 'postcss';
import autoprefixer from 'autoprefixer';
import sass from '@csstools/postcss-sass';
import cssnano from 'cssnano';
import ora from 'ora';

const cwd = process.cwd();

export default async function postcss() {
	const spinner = ora('Processing styles').start();
	const processors = [sass, autoprefixer({ grid: true })];

	if (process.env.NODE_ENV === 'production') {
		processors.push(cssnano);
	}

	await fs.ensureDir('.expressx/build/public/styles');

	const css = await fs.readFile(join(cwd, 'public/styles/styles.scss'));
	const result = await postCSS(processors).process(css, {
		from: join(cwd, 'public/styles/styles.scss'),
		to: join(cwd, '.expressx/build/public/styles/styles.css'),
	});

	await fs.writeFile(join(cwd, '.expressx/build/public/styles/styles.css'), result.css);
	if (result.map) {
		await fs.writeFile(join(cwd, '.expressx/build/public/styles/styles.css.map'), result.map);
	}
	spinner.stop();
}
