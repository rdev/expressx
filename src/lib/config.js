import { join } from 'path';
import fs from 'fs-extra';
import invariant from 'fbjs/lib/invariant';

/* eslint-disable global-require, import/no-dynamic-require, security/detect-non-literal-require */

const cwd = process.cwd();
const userConfigPath = join(cwd, 'expressx.config.js');

// Standard config that can be extended
const defaultConfig = {
	babel: {
		ignore: [],
		sourceMaps: 'inline',
		babelrc: false,
		presets: [join(__dirname, '../../babel/server.js')],
	},
	http2: false, // { key, cert }
	port: 3000,
	poweredByHeader: 'ExpressX',
	errorHandling: true,
	i18n: {
		locales: ['en'],
		cookie: 'locale',
		path: 'locales',
		objectNotation: true,
	},
	hbs: {
		views: 'views',
		partials: 'views/partials',
		layouts: 'views/layouts',
		defaultLayout: 'views/layouts/default',
	},
	staticFolder: 'public',
	autoprefixer: {
		grid: true,
		map: true,
	},
	helmet: null, // helmet options
	styles: ['public/styles/styles.scss'],
	webpackMode: 'direct',
	webpack: config => config,
	webpackDevMiddleware: {
		publicPath: '/js/',
	},
	disableWebpack: false,
	watchmanIgnore: [],
};

/**
 * Make sure everything is what it's supposed to be
 *
 * @param {any} config - ExpressX config
 */
function validateConfig(config) {
	const {
		webpackMode,
		poweredByHeader,
		webpack,
		webpackDevMiddleware,
		port,
		styles,
		babel,
	} = config;
	invariant(
		webpackMode === 'middleware' || webpackMode === 'direct',
		'Unknown Webpack mode "%s". Supported modes are "direct" and "middleware"',
		webpackMode,
	);
	invariant(
		typeof poweredByHeader !== 'function' && typeof poweredByHeader !== 'number',
		"poweredByHeader can't be set to %s",
		typeof poweredByHeader,
	);
	invariant(typeof webpack === 'function', 'Webpack config must be a function');
	invariant(
		typeof webpackDevMiddleware.publicPath === 'string',
		'"publicPath" option is required for webpack-dev-middleware',
	);
	invariant(
		typeof port === 'number' || typeof port === 'string',
		'Invalid type "%s" for "port"',
		typeof port,
	);
	invariant(Array.isArray(styles), '"styles" must be an array of path strings');
	if (babel && babel.ignore) {
		invariant(
			Array.isArray(babel.ignore),
			'Please specify Babel ignore paths as an array of globs',
		);
	}
}

// Merge default config and user config
function buildConfig() {
	const userConfig = fs.existsSync(userConfigPath) ? require(userConfigPath) : {};
	const config = {
		...defaultConfig,
		...userConfig,
	};

	// Validate
	validateConfig(config);

	return config;
}

const config = buildConfig();

export default config;
