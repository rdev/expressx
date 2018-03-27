<p align="center">
        <img alt="ExpressX" title="ExpressX" src="https://storage.googleapis.com/fivepointseven/expressx-logo.svg" width="550">
</p>
<p align="center">Smooth developer experience for Express.js</p>

[![Vave Code Style](https://img.shields.io/badge/code_style-vave-21DFEA.svg)](https://github.com/fivepointseven/vave)

# What is this

ExpressX is a build system inspired by Next.js designed to make developing [Express](https://github.com/expressjs/express) applications a breeze. It is a litte opinionated, but everything is quite sensible. It also supports custom configurations for pretty much everything.

## I already have Gulp. What's in it for me?

Unlike general purpose task runners, ExpressX is designed specifically for Express applications. It can do a whole bunch of things that task runners can't. 

Here's a full list of sweet stuff ExpressX handles automatically for you:

### Backend
- ES6/7/Next (Babel's `stage-3`)
- Flow types handling
- HTTP/2 support
- Proper live reload (including server side changes)
- Body parsing
- Handlebars setup
- I18n setup
- [Helmet](https://github.com/helmetjs/helmet) for security
- Gzip compression
- I18n's `__`, `hbs` and `express.Router` are automatically provided to the files using them with no need to import 

### Styles
- Sass/SCSS compilation
- Autoprefixing
- Minification in production

### Frontend
- Webpack bundling
- webpack-dev-middleware support
- Hot Module Replacement support

### Misc
- Sweet error reporting from Babel/Webpack/Sass
- Clean console output
- **SPEED**

## I'm sold! How do I get started?

To get started, first install expressx

`npm install -g https://github.com/rdev/expressx`

Then create a new direcrory and run `expressx init` inside:

```bash
mkdir new-project
cd new-project
expressx init
```

And you're good to go!

To start your app, just use `npm start`.

## How to move around here

The main thing you should take a look at is the `app.js` file.

In ExpressX, this file should export a function like so:

```js
export default (app) => {
    // "app" is an express application instance
    // Do your setup here
    app.use('/', routes);

    return app; // Important, return "app" in the end
}
```

This file is the main entrypoint of your app. All the configuration should be done here.

### Config

You can also configure a whole bunch of things. To do it, you can create a file called `expressx.config.js` in the root of your project.

Here's what this file with all default settings looks like:

```js
module.exports = {
    babel: {
        ignore: [],
        sourceMaps: 'inline',
        presets: 'expressx/babel/server',
    },
    http2: false, // { key, cert }
    port: 3000,
    poweredByHeader: 'ExpressX', // string | false
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
    },
    helmet: null, // helmet.js options
    styles: ['public/styles/styles.scss'],
    stylesOut: 'public/css',
    webpackMode: 'direct', // "direct" | "middleware"
    webpack: config => config,
    webpackDevMiddleware: {
        publicPath: '/js/',
    },
    disableWebpack: false,
    watchmanIgnore: [],
    debugPort: 5858,
}
```

Let's break each field down.

- **`babel`** - Babel's standard [options](https://babeljs.io/docs/core-packages/#options) object
- **`http2`** - HTTP/2 configuration object: `{ key: 'path/to/keyfile', cert: 'path/to/cert' }`
- **`port`** - Port to run the app on
- **`poweredByHeader`** - Set custom `X-Powered-By` header. Set to `false` to disable it
- **`errorHandling`** - Use default error handling. Set to `false` if you use your own handlers
- **`i18n`** - i18n standard [options](https://www.npmjs.com/package/i18n#list-of-all-configuration-options) object
- **`hbs`** - Handlebars views/layouts/partials paths and default layout
- **`staticFolder`** - Path to static files
- **`autoprefixer`** - Autoprefixer [options](https://github.com/postcss/autoprefixer#options) object
- **`helmet`** - [Helmet](https://github.com/helmetjs/helmet) options object
- **`styles`** - Array of paths to styles entrypoints
- **`stylesOut`** - Override styles output directory
- **`webpackMode`** - Webpack mode. Can be set to `"direct"` or `"middleware"`. Direct mode is _usually_ faster. Middleware mode will use [webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware) and [webpack-hot-middleware](https://github.com/glenjamin/webpack-hot-middleware). _(**Note:** Though hot reloading is supported, it's not configured by default. You still have to set it up to suit your app)_
- **`webpack`** - A function that accepts a Webpack config and returns a Webpack config. Use this to extend default configuration with your own. Scroll down to see default Webpack config
- **`webpackDevMiddleware`** - webpack-dev-middleware [options](https://github.com/webpack/webpack-dev-middleware#options) object
- **`disableWebpack`** - Set this to `false` to disable Webpack altogether
- **`watchmanIgnore`** - Specify globs for file watcher to ignore
- **`debugPort`** - Custom port to run the debugger on when using `--debug`

### Default Webpack config

```js
const webpackConfig = {
    context: cwd, // context is the project root
    devtool: process.env.NODE_ENV === 'production' ? 'inline-sourcemap' : false,
    mode: process.env.NODE_ENV === 'production' ? 'development' : 'production',
    entry: {
        app: './public/js/app.js',
    },
    resolve: {
        extensions: ['.js', '.jsx'],
    },
    module: {
        rules: [
           {
                test: /\.jsx?$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel-loader',
                query: {
                    presets: 'expressx/babel/client',
                },
           },
        ],
    },
    output: {
        path: join(cwd, '.expressx/build/public/js'),
        filename: '[name].min.js',
    },
    plugins: process.env.NODE_ENV === 'production'
        ? [new Webpack.HotModuleReplacementPlugin()]
        : [new Webpack.optimize.AggressiveMergingPlugin()],
}
```

Since ExpressX is using Webpack 4, minification is done automatically in production mode.

### Exporting builds

In some cases you may need to separate the steps of generating the build and running it. ExpressX provides a simple way to do export your build and run it later. To build, use:

```bash
expressx build
```

And to run after the build is done:

```bash
expressx start
```

### Debugging

You can attach to Node debugger by passing a `--debug` option to ExpressX like so:

```bash
expressx --debug

# OR

expressx start --debug
```