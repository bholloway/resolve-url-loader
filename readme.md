# Resolve URL Loader

[![NPM](https://nodei.co/npm/resolve-url-loader.png)](http://github.com/bholloway/resolve-url-loader)

Webpack loader that rsesolves an absolute path of url() statements based on the original file.

Use in conjunction with the [sass-loader](https://www.npmjs.com/package/sass-loader) and specify your assets relative
to the `sass` file in question. This plugin will use the source-map from the `sass` compiler to locate the original file
and write a more complete path for your asset. Subsequent build steps can then locate your asset for processing.

## Usage

Refer to the [`sass-loader`](https://github.com/jtangelder/sass-loader) for more information on `sass`->`css`
compilation for Webpack.

``` javascript
var css = require('!css!resolve-url!sass?sourceMap!./file.scss');
```

Use in tandem with the [`style-loader`](https://github.com/webpack/style-loader) to compile sass and to add the css 
rules to your document:

``` javascript
require('!style!css!resolve-url!sass?sourceMap!./file.scss');
```

### Source maps required

Note that `sourceMap` must be enabled on the `sass` transpiler.

### Apply via webpack config

It is preferable to adjust your `webpack.config` so to avoid having to prefix every `require()` statement:

``` javascript
module.exports = {
  module: {
    loaders: [
      {
        test: /\.scss$/,
        loader: 'style!css!resolve-url!sass?sourceMap'
      }
    ]
  }
};
```

## Known issues

Currently writes absolute paths for assets. This is
[bad practice](http://webpack.github.io/docs/how-to-write-a-loader.html#should-not-embed-absolute-paths) since they may
appear in your bundle.

More work needs to be done to make them relative to some `modules` path. However in the mean time this loader may get
you out of a bind.