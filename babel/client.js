/* eslint-disable global-require */
const env = process.env.BABEL_ENV || process.env.NODE_ENV;

module.exports = () => {
	const presets = [
		env === 'test'
			? [require('@babel/preset-env').default, { targets: { node: 'current' } }]
			: [
				require('@babel/preset-env').default,
				{
					targets: {
						ie: 10,
					},
				},
			  ],
		require.resolve('@babel/preset-react'),
		require.resolve('@babel/preset-flow'),
	];

	const plugins = [
		require.resolve('@babel/plugin-proposal-optional-chaining'),
		[require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }],
		require.resolve('@babel/plugin-proposal-object-rest-spread'),
		require.resolve('@babel/plugin-proposal-class-properties'),
		require.resolve('@babel/plugin-proposal-optional-catch-binding'),
		require.resolve('@babel/plugin-proposal-do-expressions'),
		require.resolve('@babel/plugin-transform-runtime'),
	];

	return {
		presets,
		plugins,
	};
};
