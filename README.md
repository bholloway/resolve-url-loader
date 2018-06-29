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

- [ ] Automated tests I

  * test-my-cli
  - [x] basic tests
  - [x] tests run on both Mac and Windows
  - [x] better ENV `append` (rename to `merge`)
    - [x] regex key matching
    - [x] custom merge fn

  * resolve-url-loader
  - [x] check some typical directory structures
  - [x] check `keepQuery` option
  - [x] check URIs with protocols are not processed
  - [x] check `absolute` option
  - [x] check `debug` option
  - [ ] check `root` option
  - [ ] check defunct options lead to warnings
  - [ ] check `silent` option supresses warnings

- [ ] Rewrite README.md
  * The `absolute` option requires `css-loader` with option `root: ''`.
  * [Breaking] Errors always fail and are no longer swallowed
  * [Breaking] File search not supported (`join` option available)
  * [Breaking] Multiple options changed
  * [Breaking] Root can only be empty or absolute path (like css-loader)

- [ ] Attempt a basic Postcss Engine (to ensure restructure is adequate)

- [ ] Automated tests II

  * test-my-cli
  - [ ] allow `layer` to further nest `root` directory

  * resolve-url-loader-filesearch
  - [ ] check `searchJoin`
  - [ ] check `verboseSearchJoin`
  - [ ] check search works and is limited by `attempts` option
  - [ ] check `includeRoot` option

- [ ] Rewrite README.md
  - [ ] resolve-url-loader-filesearch
