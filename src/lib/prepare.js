import path from 'path';
import fs from 'fs-extra';
import i18n from 'i18n';
import express from 'express';
import hbs from 'express-hbs';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
// import favicon from 'serve-favicon';

const cwd = process.cwd();

export default function prepare(appInitializer) {
	let app = express();
	fs.ensureDirSync('.expressx/build/public');
	// @TODO Config file
	// app.use(favicon(path.join(cwd, 'public', 'favicon.ico')));
	i18n.configure({
		locales: ['en'],
		cookie: 'locale',
		directory: path.join(cwd, 'locales'),
		objectNotation: true,
	});

	app.engine(
		'hbs',
		hbs.express4({
			partialsDir: path.join(cwd, 'views/partials'),
			layoutsDir: path.join(cwd, 'views/layouts'),
			defaultLayout: path.join(cwd, 'views/layouts/default'),
			i18n,
		}),
	);
	app.set('views', path.join(cwd, 'views'));
	app.set('view engine', 'hbs');

	app.use(helmet());
	app.use((req, res, next) => {
		res.setHeader('X-Powered-By', 'ExpressX');
		next();
	});
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(cookieParser());
	app.use(express.static(path.join(cwd, 'public')));
	app.use(i18n.init);
	app.use(compression());

	app = appInitializer(app);

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

	// @TODO Awesome error handling
	// @TODO SCSS/PostCSS

	return app;
}
