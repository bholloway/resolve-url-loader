'use strict';

const path = require('path');
const SourceMapDevToolPlugin = require('webpack').SourceMapDevToolPlugin;
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

class DegeneratePlugin {
  apply() {}
}

module.exports = {
  entry: path.join(__dirname, process.env.ENTRY),
  output: {
    path: path.join(__dirname, process.env.OUTPUT),
    filename: '[name].js',
    publicPath: '',
    devtoolModuleFilenameTemplate: '[resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[resource-path]',
  },
  devtool: false,
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
    JSON.parse(process.env.DEVTOOL) ? new SourceMapDevToolPlugin({
      filename: '[file].map',
      moduleFilenameTemplate: '[resource-path]',
      append: process.env.NODE_ENV !== 'production' && undefined,
      noSources: true
    }) : new DegeneratePlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
  ],
  optimization: {
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          processorOptions: {
            map: !!JSON.parse(process.env.DEVTOOL) && {inline: false},
            // the following optimisations are fine but e2e assertions are easier without them
            cssDeclarationSorter: false,
            normalizeUrl: false,
            discardUnused: false
          }
        }
      })
    ]
  }
};
