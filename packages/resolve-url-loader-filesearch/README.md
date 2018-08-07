# Resolve URL Loader filesearch

This is the custom `join` function for [https://www.npmjs.com/package/resolve-url-loader](resolve-url-loader)

It provides legacy file-search "magic" for `resolve-url-loader@>=3.0`.

> **WORK IN PROGRESS** This is currently just a dump of the old file-search code.
> There are no immediate plans to release it.
> Open an issue if you need this released.

## TODO

- [ ] migrate `fileSearch` to new `join` API

- [ ] tests
  - [ ] check search works and is limited by `attempts` option
  - [ ] check `includeRoot` option
  - [ ] ...

- [ ] Rewrite README.md
