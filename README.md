> :tada: **Version 3 is near, but we need your help!**
>
> Please install `resolve-url-loader@next` and vote :thumbsup: or :thumbsdown: in the [the discussion issue](https://github.com/bholloway/resolve-url-loader/issues/97#issuecomment-419619431).

# Resolve URL Loader

Webpack loader that resolves relative paths in url() statements based on the original source file.

Use in conjunction with the [sass-loader](https://www.npmjs.com/package/sass-loader) and specify your asset `url()` relative to the `.scss` file in question.

This loader will use the source-map from the SASS compiler to locate the original `.scss` source file and write a more Webpack-friendly path for your asset. The CSS loader can then locate your asset for individual processing.


## Getting started

See [resolve-url-loader](packages/resolve-url-loader/README.md) package in this mono-repo.


## Version 3.0.0

The target for the next major version

- [x] Allow additional CSS "engines" (e.g. postcss)

- [x] Move the file search to a separate package as "opt in"

- [ ] Automated tests
  - [x] basic tests
  - [x] tests run on both Mac and Windows

  * resolve-url-loader
  - [x] check some typical directory structures
  - [x] check `keepQuery` option
  - [ ] check URIs with protocols are not processed
  - [ ] check `absolute` option
  - [ ] check `debug` option
  - [ ] check `fail` option
  - [ ] check `silent` option

  * resolve-url-loader-filesearch
  - [ ] check file search works and is limited by `attempts` option
  - [ ] OPTIONAL test `root` and `includeRoot` options when using file search

- [ ] Rewrite README.md
  - [ ] resolve-url-loader
  - [ ] resolve-url-loader-filesearch

- [ ] Attempt a basic Postcss Engine (to ensure restructure is adequate)


