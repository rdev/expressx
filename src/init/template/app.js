import index from './routes/index';

export default (app) => {
	app.use('/', index);
	return app;
};
