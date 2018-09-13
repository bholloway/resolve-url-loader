# Resolve URL Loader filesearch

This is the now defunct file search "magic" from `resolve-url-loader@<3.0.0`.

**DISCLAIMER**

* Needs to be adapted as a `join` function to be useful to anyone.
* Currently unpublished.
* Currently no plans to work on this.

## This is not the fix you are looking for!

The file-search "magic" was always a hack and solved problems back in the days when `.css` was distributed by [Bower](https://bower.io/). Back then it was common for packages to be broken.

Now days bundling CSS is common place and broken packages are quickly fixed. It should be possible to solve your use-case without a full file search.

The author recommends you use the `join` option in `resolve-url-loader@>=3.0.0` to make a more targeted fix.

If you need a full file-search for some other application feel free to canabalise this code.
