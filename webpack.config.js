const path = require('path');
const rimraf = require('rimraf');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	mode: 'production',
	entry: {
		background: path.resolve(__dirname, 'src', 'background.ts'),
		popup: path.resolve(__dirname, 'src', 'popup.ts'),
		'content.idle': path.resolve(__dirname, 'src', 'content.idle.ts'),
		'content.start': path.resolve(__dirname, 'src', 'content.start.ts'),
	},
	output: {
		path: path.join(__dirname, 'dist'),
		filename: '[name].js',
	},
	resolve: {
		extensions: ['.ts', '.js'],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{ from: '.', to: '.', context: 'public' },
				{ from: '.', to: '.', context: 'assets' },
			],
		}),
		new (class {
			apply(compiler) {
				compiler.hooks.done.tap('Remove LICENSE', () => {
					console.log('Remove LICENSE.txt');
					rimraf.sync('./dist/*.LICENSE.txt');
				});
			}
		})(),
	],
};
