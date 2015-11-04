# Resolve URL Loader

[![NPM](https://nodei.co/npm/resolve-url-loader.png)](http://github.com/bholloway/resolve-url-loader)

Webpack loader that resolves relative paths in url() statements based on the original source file.

Use in conjunction with the [sass-loader](https://www.npmjs.com/package/sass-loader) and specify your asset `url()` relative to the `.scss` file in question.

This loader will use the source-map from the SASS compiler to locate the original `.scss` source file and write a more Webpack-friendly path for your asset. The CSS loader can then locate your asset for individual processing.

## Usage

Plain CSS works fine:

``` javascript
var css = require('!css!resolve-url!./file.css');
```

or using [sass-loader](https://github.com/jtangelder/sass-loader):

``` javascript
var css = require('!css!resolve-url!sass?sourceMap!./file.scss');
```

Use in tandem with the [`style-loader`](https://github.com/webpack/style-loader) to compile sass and to add the css rules to your document:

``` javascript
require('!style!css!resolve-url!./file.css');
```

and

``` javascript
require('!style!css!resolve-url!sass?sourceMap!./file.scss');
```

### Source maps required

Note that **source maps** must be enabled on any preceding loader. In the above example we use `sass?sourceMap`.

In some use cases (no preceding transpiler) there will be no incoming source map. Therefore we do not warn if the source-map is missing.

However if there is an incomming source-map then it must imply `source` information at each CSS `url()` statement.

### Apply via webpack config

It is preferable to adjust your `webpack.config` so to avoid having to prefix every `require()` statement:

``` javascript
module.exports = {
  module: {
    loaders: [
      {
        test   : /\.css$/,
        loaders: ['style', 'css', 'resolve-url']
      }, {
        test   : /\.scss$/,
        loaders: ['style', 'css', 'resolve-url', 'sass?sourceMap']
      }
    ]
  }
};
```

### Options

Options may be set using [query parameters](https://webpack.github.io/docs/using-loaders.html#query-parameters) or by using [programmatic parameters](https://webpack.github.io/docs/how-to-write-a-loader.html#programmable-objects-as-query-option). Programmatic means the following in your `webpack.config`.

``` javascript
module.exports = {
   resolveUrlLoader: {
      ...
   }
}
```

Where `...` is a hash of any of the following options.

* `absolute` Forces the url() to be resolved to an absolute path. This is considered 
[bad practice](http://webpack.github.io/docs/how-to-write-a-loader.html#should-not-embed-absolute-paths) so only do it if you know what you are doing.

* `sourceMap` Generate a source-map.

* `silent` Do not display warnings on CSS syntax or source-map error.

* `fail` Syntax or source-map errors will result in an error.

* `root` An optional directory within which search may be performed. Relative paths are permitted. Where omitted `process.cwd()` is used and should be sufficient for most use cases.

Note that query parameters take precedence over programmatic parameters.

## How it works

A [rework](https://github.com/reworkcss/rework) process is run on incoming CSS.

Each `url()` statement that implies an asset triggers a file search using node `fs` operations. The asset should be relative to the original source file that was transpiled. This file is determined by consulting the incomming source-map at the point of the `url()` statement.

Usually the asset is found relative to the original source file. However in some cases there is no immediate match (*cough* bootstrap *cough*) and we so we start searching both deeper and shallower from the starting directory.

Shallower paths must be limited to avoid the whole file system from being considered. Progressively shallower paths within the `root` will be considered. Paths featuring a `package.json` or `bower.json` file will not be considered.

If the asset is not found then the `url()` statement will not be updated with a Webpack module-relative path. However if the `url()` statement has no source-map `source` information the loader will fail.

The loader will also fail when input source-map `sources` cannot all be resolved relative to some consistent path within `root`.
