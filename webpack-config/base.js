//html页面操作
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
	//common config
	entry: process.cwd() + '/src/index.js',

	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: [/node_modules/],
				loader: 'babel-loader'
			},
			{
				test: /\.html$/,
				loader: 'html-loader',
				options: {
					minimize: true
				}
			},
			{
				test: /\.(jpe?g|png|gif|svg)$/i,
				loader: 'url-loader',
				options: {
					limit: 10000,
					hash: 'sha512',
					publicPath: '/',
					name: 'assets/images/[hash].[ext]'
				}
			}
		]
	},

	plugins: [
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: process.cwd() + '/src/index.html',
			favicon: process.cwd() + '/src/index.html'
		})
	],

	resolve: {
		extensions: ['.js'],
		alias: {
			src: path.resolve(__dirname, './..src')
		}
	}
};