//用于合并base config 和特定环境的config
const webpackMerge = require('webpack-merge');
const base = require('./base');
const path = require('path');

module.exports = webpackMerge(base, {
	//specific config
	output: {
		filename: '[name].bundle.js'
	},
	devtool: 'eval-source-map',

	module: {
		rules: [
			{
				test: /\.scss$/,
				exclude: [/node_modules/],
				use: [
					'style-loader',
					{
						loader: 'css-loader',
						options: {
							sourceMap: true
						}
					},
					'postcss-loader',
					{
						loader: 'sass-loader',
						options: {
							sourceMap: true
						}
					}
				]
			}
		]
	},

	resolve: {
		alias: {
			config: path.resolve(__dirname, './../src/config/dev.js')
		}
	}
});