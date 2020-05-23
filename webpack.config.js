var path = require('path');
var webpack = require('webpack');
var awsExternals = require('webpack-aws-externals');
var ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const slsw = require('serverless-webpack');
const GitRevisionPlugin = require('git-revision-webpack-plugin');
var _ = require('lodash');

module.exports = {  
  entry: slsw.lib.entries,
  target: 'node',
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
            { loader: 'cache-loader' },
            {
                loader: 'thread-loader',
                options: {
                    // there should be 1 cpu for the fork-ts-checker-webpack-plugin
                    workers: require('os').cpus().length - 1,
                    poolTimeout: Infinity // set this to Infinity in watch mode - see https://github.com/webpack-contrib/thread-loader
                },
            },
            {
                loader: 'ts-loader',
                options: {
                    happyPackMode: true // IMPORTANT! use happyPackMode mode to speed-up compilation and reduce errors reported to webpack
                }
            }
        ]
      },
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
  externals: [awsExternals()],
  plugins: [
    new ForkTsCheckerWebpackPlugin({ checkSyntacticErrors: true }),
    new webpack.IgnorePlugin(/\.(css|less)$/),
    new webpack.DefinePlugin({
      "process.env.COMMIT_HASH": JSON.stringify(new GitRevisionPlugin().commithash())
    })
  ]
};