'use strict';

const path = require('path');
const LastCallWebpackPlugin = require('last-call-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const processFn = require('adjust-sourcemap-loader/lib/process');

module.exports = {
  entry: path.join(__dirname, process.env.ENTRY),
  output: {
    path: path.join(__dirname, process.env.OUTPUT),
    filename: '[name].js',
    devtoolModuleFilenameTemplate: '[resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[resource-path]',
  },
  devtool: JSON.parse(process.env.DEVTOOL) && 'nosources-source-map',
  resolve: {
    modules: [path.join(__dirname, 'modules'), 'node_modules'] // specifically for isolation in module-relative test
  },
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
          options: Object.assign(
            JSON.parse(process.env.LOADER_OPTIONS),
            process.env.LOADER_JOIN && {
              join: new Function('require', process.env.LOADER_JOIN)(require) // jshint ignore:line
            }
          )
        }, {
          loader: 'sass-loader',
          options: {
            sourceMap: true,
            sassOptions: {
              sourceMapContents: true
            }
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
    }),
    // currently devtoolModuleFilenameTemplate is not respected by OptimizeCSSAssetsPlugin so we must do it ourselves
    new LastCallWebpackPlugin({
      assetProcessors: [{
        phase: LastCallWebpackPlugin.PHASES.EMIT,
        regExp: /\.css\.map/,
        processor: (assetName, asset) => Promise.resolve(JSON.parse(asset.source()))
          .then(obj => processFn({}, {format: 'projectRootRelative'}, obj))
          .then(obj => JSON.stringify(obj))
      }]
    })
  ],
  optimization: {
    minimizer: [
      new OptimizeCSSAssetsPlugin({
        cssProcessorOptions: {
          map: !!JSON.parse(process.env.DEVTOOL),
          // the following optimisations are fine but e2e assertions are easier without them
          cssDeclarationSorter: false,
          normalizeUrl: false,
          discardUnused: false
        }
      })
    ]
  }
};
