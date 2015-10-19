# Resolve URL Loader

[![NPM](https://nodei.co/npm/resolve-url-loader.png)](http://github.com/bholloway/resolve-url-loader)

Webpack loader that resolves relative paths in url() statements based on the original source file.

Use in conjunction with the [sass-loader](https://www.npmjs.com/package/sass-loader) and specify your asset url()
relative to the `scss` file in question. This loader will use the source-map from the SASS compiler to locate the
original file and write a more complete path for your asset. Subsequent build steps can then locate your asset for
processing.

## Usage

Plain CSS works fine:

``` javascript
var css = require('!css!resolve-url!./file.css');
```

or using [sass-loader](https://github.com/jtangelder/sass-loader):

``` javascript
var css = require('!css!resolve-url!sass?sourceMap!./file.scss');
```

Use in tandem with the [`style-loader`](https://github.com/webpack/style-loader) to compile sass and to add the css 
rules to your document:

``` javascript
require('!style!css!resolve-url!./file.css');
```

and

``` javascript
require('!style!css!resolve-url!sass?sourceMap!./file.scss');
```

### Source maps required

Note that **source maps** must be enabled on any preceding loader. In the above example we use `sass?sourceMap`.

In some use cases (no preceding transpiler) there will be no incoming source map. Therefore we do not warn if the
source-map is missing.

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

* `absolute` Forces the url() to be resolved to an absolute path. This is considered 
[bad practice](http://webpack.github.io/docs/how-to-write-a-loader.html#should-not-embed-absolute-paths) so only do it
if you know what you are doing.

* `sourceMap` Generate a source-map.

* `silent` Do not display warnings on CSS syntax or source-map error.

* `fail` Syntax or source-map errors will result in an error.

## How it works

The incoming source-map is used to resolve the original file. This is necessary where there was some preceding transpile
step such as SASS. A [rework](https://github.com/reworkcss/rework) process is then run on incoming `css`.

Each `url()` statement that implies an asset triggers a file search using  node `fs` operations. The search begins
relative to the original file and usually the asset is found immediately. However in some cases there is no immediate
match (*cough* bootstrap *cough*) and we so we start searching both deeper and shallower from the starting directory.
The search will continue while within the project directory and until a `package.json` or `bower.json` file is 
encountered.

If the asset is not found then the `url()` statement will not be updated.

As a whole the plugin will not operate when:
 * input source-map sources cannot be found relative to some consistent project path, or;
 * input source-map does not contain filename information at url() declarations