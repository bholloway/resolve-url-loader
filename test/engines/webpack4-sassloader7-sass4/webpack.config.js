'use strict';

const path = require('path');
const sassLoader = require.resolve('sass-loader');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
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
    rules: [{
      test: /\.scss$/,
      use: [
        MiniCssExtractPlugin.loader,
        {
          loader: 'css-loader',
          options: JSON.parse(process.env.CSS_OPTIONS)
        }, {
          loader: 'resolve-url-loader',
          options: JSON.parse(process.env.LOADER_OPTIONS)
        }, {
          loader: sassLoader,
          options: {
            sourceMap: true,
            sourceMapContents: false
          }
        }
      ]
    }, {
      test: /\.(woff2?|ttf|eot|svg|jpg)(?:[?#].+)?$/,
      use: [{
        loader: 'file-loader'
      }]
    }]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    })
  ]
};
