/* eslint-disable global-require */
const path = require('path');

const env = process.env.BABEL_ENV || process.env.NODE_ENV;

module.exports = () => {
	const presets = [
		env === 'test'
			? [require('babel-preset-env').default, { targets: { node: 'current' } }]
			: [
				require('babel-preset-env').default,
				{
					targets: {
						ie: 10,
					},
				},
			  ],
		require.resolve('babel-preset-stage-3'),
		require.resolve('babel-preset-react'),
		require.resolve('babel-preset-flow'),
	];

	const plugins = [
		// @TODO Optional chaining once Babel 7 is out of beta
		require.resolve('babel-plugin-transform-decorators-legacy'),
		require.resolve('babel-plugin-transform-class-properties'),
		require.resolve('babel-plugin-transform-object-rest-spread'),
		require.resolve('babel-plugin-transform-optional-catch-binding'),
		require.resolve('babel-plugin-transform-do-expressions'),
		[
			require.resolve('babel-plugin-transform-runtime'),
			{
				// Resolve the Babel runtime relative to the config.
				moduleName: path.dirname(require.resolve('babel-runtime/package')),
			},
		],
	];

	return {
		presets,
		plugins,
	};
};
