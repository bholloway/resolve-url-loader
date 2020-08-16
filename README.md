# Resolve URL Loader

A **webpack loader** that rewrites relative paths in url() statements based on the original source file.

## Why?

> **TL;DR** Making Sass work with a feature based project structure

With webpack you can import a `.scss` file (or some other compile-to-css file) and have a loader take care of the transpilation. With **Sass** (at least) this file can include a whole tree of source files into a single output.

We can imagine a virtual `.css` file at the location the original `.scss` import. Webpack expects any **assets** found in this CSS to be relative to the original imported file.

For projects with a **feature based structure** this will be a problem, since you will want to **co-locate** your assets with your `.scss` partials.

**Example** - webpack imports `index.scss` which includes feature `foo`.

| files                              | content                |
|------------------------------------|------------------------|
|src /                               |                        |
|&nbsp;&nbsp;index.scss              | `@import features/foo` |
|&nbsp;&nbsp;features /              |                        |
|&nbsp;&nbsp;&nbsp;&nbsp;_foo.scss   | `url(bar.png)`         |
|&nbsp;&nbsp;&nbsp;&nbsp;bar.png     |                        |

Intuitively we want the assets in partial `_foo.scss` relative to the partial, meaning `url(bar.png)`.

However webpack's `css-loader` will encounter `url(bar.png)` and expect to find `src/bar.png`. This is **not** the correct location and the build will fail.

Thankfully `resolve-url-loader` provides the "url rewriting" that Sass is missing. Use it _after_ the transpiler (such as [sass-loader](https://www.npmjs.com/package/sass-loader)). It makes use of the [source-map](http://www.mattzeunert.com/2016/02/14/how-do-source-maps-work.html) to find the original source file and rewrite `url()` statements.

In our example it rewrites `url(bar.png)` to `url(features/bar.png)` as required.

## Getting started

See [resolve-url-loader](packages/resolve-url-loader/README.md) package.

## Other stuff

See [test-my-cli](packages/test-my-cli/README.md) package for a functional programming framework for cli-testing. An unpublished work in progress.

See [resolve-url-loader-filesearch](packages/resolve-url-loader-filesearch/README.md) package for the now defunct file search "magic" from `resolve-url-loader@<3.0.0`. This is currently unpublished. It needs to be adapted as a `join` function to be useful to anyone.
