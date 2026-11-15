var path = require('path');
var webpack = require('webpack');
var nodeExternals = require('webpack-node-externals');
const slsw = require('serverless-webpack');
const { GitRevisionPlugin } = require('git-revision-webpack-plugin');
var _ = require('lodash');

function gitBranch() {
  try {
    return new GitRevisionPlugin().branch();
  } catch {
    return undefined;
  }
}

module.exports = {  
  entry: slsw.lib.entries,
  target: 'node',
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      { test: /\.ts(x?)$/, loader: 'ts-loader' },
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
  externalsPresets: { node: true },
  externals: [nodeExternals()],
  plugins: [
    new webpack.IgnorePlugin({ resourceRegExp: /\.(css|less)$/ }),
    new webpack.BannerPlugin({ banner: 'require("reflect-metadata");', raw: true, entryOnly: false }),
    new webpack.BannerPlugin({ banner: 'require("source-map-support").install();', raw: true, entryOnly: false }),
    new webpack.DefinePlugin({
      "process.env.COMMIT_HASH": JSON.stringify(new GitRevisionPlugin().commithash()),
      // Rollbar: the branch, and the directory the bundle was built from. Stack
      // frames carry absolute source paths from this build (see
      // devtoolModuleFilenameTemplate), so Rollbar strips this root to map them
      // to repo files.
      "process.env.COMMIT_BRANCH": JSON.stringify(process.env.GITHUB_REF_NAME || gitBranch()),
      "process.env.SOURCE_ROOT": JSON.stringify(__dirname)
    })
  ]
};