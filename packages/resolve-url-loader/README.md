# Resolve URL Loader

[![NPM](https://nodei.co/npm/resolve-url-loader.png)](https://www.npmjs.com/package/resolve-url-loader)

This **webpack loader** allows you to have a distributed set SCSS files and assets co-located with those SCSS files.

## Do you organise your SCSS and assets by feature?

Where are your assets?

* ✅ I want my assets all over the place, next to my SCSS files.
* ❌ My assets are in a single directory.

How complicated is your SASS?

* ✅ I have a deep SASS composition with partials importing other partials.
* ✅ My asset paths are constructed by functions or `@mixin`s.
* ❌ I have a single SCSS file. The asset paths are just explicit in that.

What asset paths are you using?

* ✅ Fully relative `url(./foo.png)` or `url(foo.png)`
* ❌ Root relative `url(/foo.png)`
* ❌ Relative to some package or webpack root `url(~stuff/foo.png`)
* ❌ Relative to some variable which is your single asset directory `url($variable/foo.png)`

What webpack errors are you getting?

* ✅ Webpack can't find the relative asset `foo.png` 😞
* ❌ Webpack says it doesn't have a loader for `fully/resolved/path/foo.png` 😕

If you can tick at least 1 item in **all of these questions** then use this loader. It will allow webpack to find your assets.

If in any question you can't tick any items then then webpack should be able to already find your assets and you don't need this loader. 🤷

Once webpack resolves your assets (even if it complains about loading them) then this loading is working correctly. 👍

### The details are important!

Read more about project structure and [how the loader works](docs/how-it-works.md).

There are some [advanced features](docs/advanced-features.md) that can help you resolve assets.

## Getting started

### Install

via npm

```bash
npm install resolve-url-loader --save-dev
```

via yarn

```bash
yarn add resolve-url-loader --dev
```

### Configure Webpack

The typical use case is `resolve-url-loader` between `sass-loader` and `css-loader`.

**⚠️ IMPORTANT**
* **source-maps required** for loaders preceding `resolve-url-loader` (regardless of `devtool`).
* Always use **full loader package name** (don't omit `-loader`) otherwise you can get errors that are hard to debug.


``` javascript
rules: [
  {
    test: /\.scss$/,
    use: [
      ...
      {
        loader: 'css-loader',
        options: {...}
      }, {
        loader: 'resolve-url-loader',
        options: {...}
      }, {
        loader: 'sass-loader',
        options: {
          sourceMap: true,
          sourceMapContents: false
        }
      }
    ]
  },
  ...
]
```

## Options

The loader should work without options but use these as required.

| option      | type                       | default     |            |  description                                                                                                                                                                     |
|-------------|----------------------------|-------------|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `sourceMap` | boolean                    | `false`     |            | Generate an outgoing source-map.                                                                                                                                                 |
| `removeCR`  | boolean                    | `false`     |            | Convert orphan CR to whitespace.<br/>See known issues below.                                                                                                                     |
| `debug`     | boolean                    | `false`     |            | Display debug information.                                                                                                                                                       |
| `silent`    | boolean                    | `false`     |            | Do **not** display warnings or deprecation messages.                                                                                                                             |
| `root`      | string                     | _unset_     |            | Similar to the (now defunct) option in `css-loader`.<br/>This string, possibly empty, is prepended to absolute URIs.<br/>Absolute URIs are only processed if this option is set. |
| `join`      | function                   | _inbuilt_   | advanced   | Custom join function.<br/>Use custom javascript to fix asset paths on a per-case basis.<br/>Refer to the [advanced features](docs/advanced-features.md) docs.                    |
| `engine`    | `'rework'`<br/>`'postcss'` | `'postcss'` | deprecated | The css parser engine.<br/>Using this option produces a deprecation warning.                                                                                                     |

## Limitations

### Compatiblity

Tested `macOS` and `Windows`.

All `webpack2`-`webpack4` with contemporaneous loaders/plugins using `node 8.9`. And `webpack5` with latest loaders/plugins using `node 10.0`.

Refer to `test` directory for full webpack configurations as used in automated tests.

Some edge cases with `libsass` on `Windows` (see [troubleshooting](docs/troubleshooting.md) docs).

### Known issues

Read the [troubleshooting](docs/troubleshooting.md) docs before raising an issue.
