//用于合并base config 和特定环境的config
const webpackMerge = require('webpack-merge');
//抽离css
const ExtractTextPlugin = require("extract-text-webpack-plugin");
//压缩js
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
//清空output目录，防止出现垃圾文件
const CleanWebpackPlugin = require('clean-webpack-plugin');
const path = require('path');
const base = require('./base');

module.exports = webpackMerge(base, {
	//specific config
	output: {
		filename: 'bundle.[chunkhash].js',
		path: process.cwd() + '/dist'
	},

	module: {
		rules: [
			{
				test: /\.scss$/,
				exclude: [/node_modules/],
				use: ExtractTextPlugin.extract({
					fallback: 'style-loader',
					use: [
						{
							loader: 'css-loader',
							options: {
								minimize: true
							}
						},
						'postcss-loader',
						'sass-loader'
					]
				})
				
			}
		]
	},

	plugins: [
		new CleanWebpackPlugin(['dist'], {
			root: process.cwd(),
			exclude: []
		}),
		new ExtractTextPlugin({
			filename: "bundle.[chunkhash].css"
		}),
		new UglifyJSPlugin({
			uglifyOptions: {
				warnings: false,
				output: {
					comments: false,
					beautify: false
				}
			}
		})
	],

	resolve: {
		alias: {
			config: path.resolve(__dirname, './../src/config/prod.js')
		}
	}
});