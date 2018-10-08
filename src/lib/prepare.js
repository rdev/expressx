import path from 'path';
import fs from 'fs-extra';
import i18n from 'i18n';
import express from 'express';
import hbs from 'express-hbs';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import { webpackConfig } from './webpack';
import config from './config';

const cwd = process.cwd();
const webpackCompiler = webpack(webpackConfig);

/**
 * Set up an actual express app
 *
 * @export
 * @param {any} appInitializer - User's Express setup
 * @returns
 */
export default async function prepare(appInitializer, testSetup) {
	let app = express();
	if (!testSetup) {
		fs.ensureDirSync(`.expressx/build/${config.staticFolder}`);
	}

	// Set up i18n
	i18n.configure({
		...config.i18n,
		directory: path.join(cwd, config.i18n.path),
	});

	// Handlebars
	app.engine(
		'hbs',
		hbs.express4({
			partialsDir: path.join(cwd, config.hbs.partials),
			layoutsDir: path.join(cwd, config.hbs.layouts),
			defaultLayout: path.join(cwd, config.hbs.defaultLayout),
			i18n,
		}),
	);
	app.set('views', path.join(cwd, config.hbs.views));
	app.set('view engine', 'hbs');

	// Helmet for security
	app.use(helmet(config.helmet));
	// Shameless branding. Users should disable this
	if (config.poweredByHeader) {
		app.use((req, res, next) => {
			res.setHeader('X-Powered-By', config.poweredByHeader);
			next();
		});
	}
	// Boilerplate stuff
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(cookieParser());
	app.use(express.static(path.join(cwd, `.expressx/build/${config.staticFolder}`)));
	app.use(i18n.init);
	app.use(compression());

	// Webpack middleware in development if selected
	if (process.env.NODE_ENV !== 'production' && config.webpackMode === 'middleware') {
		app.use(webpackDevMiddleware(webpackCompiler, config.webpackDevMiddleware));
		app.use(webpackHotMiddleware(webpackCompiler));
	}

	// Now it's time to bring in user's config
	app = await appInitializer(app);

	// @TODO Cool error handling
	if (config.errorHandling) {
		app.use((req, res, next) => {
			const err = new Error('Not Found');
			err.status = 404;
			next(err);
		});

		// error handler
		app.use((err, req, res) => {
			// set locals, only providing error in development
			res.locals.message = err.message;
			res.locals.error = req.app.get('env') === 'development' ? err : {};

			// render the error page
			res.status(err.status || 500);
			res.render('error');
		});
	}

	return app;
}
