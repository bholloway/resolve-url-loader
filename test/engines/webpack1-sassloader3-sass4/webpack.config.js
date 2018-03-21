'use strict';

const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const templateFn = require('adjust-sourcemap-loader')
  .moduleFilenameTemplate({format: 'projectRelative'});

module.exports = {
  entry: path.join(__dirname, process.env.ENTRY),
  output: {
    path: path.join(__dirname, path.dirname(process.env.OUTPUT)),
    filename: path.basename(process.env.OUTPUT),
    devtoolModuleFilenameTemplate: templateFn,
    devtoolFallbackModuleFilenameTemplate: templateFn
  },
  devtool: JSON.parse(process.env.DEVTOOL),
  module: {
    loaders: [{
      test: /\.scss$/,
      loader: ExtractTextPlugin.extract([
        `css-loader${process.env.CSS_QUERY}`,
        `resolve-url-loader${process.env.LOADER_QUERY}`,
        'sass-loader?sourceMap&sourceMapContents=false'
      ], {
        id: 'css'
      })
    }, {
      test: /\.(woff2?|ttf|eot|svg|jpg)(?:[?#].+)?$/,
      loader: 'file-loader'
    }]
  },
  plugins: [
    new ExtractTextPlugin('css', '[name].[md5:contenthash:hex].css')
  ]
};
