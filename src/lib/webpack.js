import { join } from 'path';
import fs from 'fs-extra';
import Webpack from 'webpack';
import config from './config';

const dev = process.env.NODE_ENV !== 'production';
const cwd = process.cwd();

const defaultWebpackConfig = {
	context: cwd,
	devtool: dev ? 'inline-sourcemap' : false,
	mode: dev ? 'development' : 'production',
	entry: {
		app: './public/js/app.js',
	},
	resolve: {
		extensions: ['.js', '.jsx'],
	},
	resolveLoader: {
		alias: {
			'babel-loader': join(__dirname, '../../node_modules/babel-loader'),
		},
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /(node_modules|bower_components)/,
				loader: 'babel-loader',
				query: {
					presets: [join(__dirname, '../../babel/client.js')],
				},
			},
		],
	},
	output: {
		path: join(cwd, '.expressx/build/public/js'),
		filename: '[name].min.js',
	},
	plugins: dev
		? [new Webpack.HotModuleReplacementPlugin()]
		: [new Webpack.optimize.AggressiveMergingPlugin()],
};

const webpackConfig = config.webpack(defaultWebpackConfig);

export { webpackConfig };

export default function webpack() {
	return new Promise(async (resolve, reject) => {
		await fs.ensureDir(webpackConfig.output.path);
		Webpack(webpackConfig, (err, stats) => {
			if (err || stats.hasErrors()) {
				reject(err || stats.toJson());
			}
			resolve({
				hash: stats.hash,
				time: stats.endTime - stats.startTime,
			});
		});
	});
}
