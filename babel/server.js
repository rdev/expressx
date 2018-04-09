/* eslint-disable global-require */

const env = process.env.BABEL_ENV || process.env.NODE_ENV;

module.exports = () => {
	const presets = [
		env === 'test'
			? [require('@babel/preset-env').default, { targets: { node: 'current' } }]
			: [
				require('@babel/preset-env').default,
				{
					modules: 'commonjs',
					targets: {
						node: 8,
					},
				},
			  ],
		require.resolve('@babel/preset-react'),
		require.resolve('@babel/preset-flow'),
	];

	const plugins = [
		[
			require.resolve('babel-plugin-auto-import'),
			{
				declarations: [
					{ default: 'i18n', members: ['__'], path: require.resolve('i18n') },
					{ default: 'hbs', path: require.resolve('express-hbs') },
					{ default: 'Router', path: require.resolve('express') },
				],
			},
		],
		require.resolve('@babel/plugin-proposal-optional-chaining'),
		require.resolve('@babel/plugin-proposal-decorators'),
		require.resolve('@babel/plugin-proposal-object-rest-spread'),
		require.resolve('@babel/plugin-proposal-class-properties'),
		require.resolve('@babel/plugin-proposal-optional-catch-binding'),
		require.resolve('@babel/plugin-proposal-do-expressions'),
	];

	return {
		presets,
		plugins,
	};
};
