var path = require('path');
var webpack = require('webpack');
var nodeExternals = require('webpack-node-externals');
const slsw = require('serverless-webpack');
const GitRevisionPlugin = require('git-revision-webpack-plugin');
var _ = require('lodash');

module.exports = {  
  entry: slsw.lib.entries,
  target: 'node',
  mode: 'none',
  devtool: 'source-map',
  module: {
    rules: [
      { test: /\.ts(x?)$/, loader: 'ts-loader' },
      { test: /\.html$/, loader: 'html-loader' }
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx', '.json']
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]'
  },
  externals: [nodeExternals()],
  plugins: [
    new webpack.IgnorePlugin(/\.(css|less)$/),
    new webpack.BannerPlugin({ banner: 'require("reflect-metadata");', raw: true, entryOnly: false }),
    new webpack.BannerPlugin({ banner: 'require("source-map-support").install();', raw: true, entryOnly: false }),
    new webpack.DefinePlugin({
      "process.env.COMMIT_HASH": JSON.stringify(new GitRevisionPlugin().commithash())
    })
  ]
};