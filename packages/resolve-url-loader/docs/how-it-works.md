# How it works

## The problem

This loader is most commonly used with SASS but regardless of the transpiler we end up with CSS. Lets look at a basic example where the structure is basically CSS but with some SASS composition features.

Working backwards here is the CSS that we are after.

```css
.cool {
  background-image: url(cool.png);
}
```
The terminolgy will be important later so lets take a refresher.

```css
.selector {
  property: value;
  property: functional-notation(argument);
}
```

Overall this is a **rule-set** where `.cool` is the **selector** and the `{...}` braces enclose one or more  **declaration**(s). In the declaration `background-image` is the **property** and `url(cool.png)` is the **value**.

To get even more specific, the `url` is the **functional-notation name** and `cool.png` is the **functional-notation argument**.


Its common in SASS for rules to come from different partials, and for declarations to be composed using mixins and functions. So lets carve up this CSS and make it interesting.

[![the detailed problem](detailed-problem.svg)](detailed-problem.svg)

As we have previously seen, webpack expects the asset to be relative the root SASS file. So we are going to need to re-write the `url()` asset path. But to what? All the subdirectories here has something that contributes to the declaration, we could reasonably place the asset in any of them.

There could be a `cool.png` in _all the directories_! Which one should we use?

Backup.. Webpack doesn't know about any of these nested files went into the SASS composition, it only knows about the root SASS file. It doesn't know there _are_ any directories where assets could reasonably exist! How then do we get the info we need to rewrite the url? 😫

## The solution

Sourcemaps! 😃

Wait.. don't run away.. sure sourcemaps can be scarey but they solve our problem reasonably well. 👍

The source-map will tell us which SASS file _claims_ to have contributed each character in the resulting CSS.

### concept

Lets look at the simple example above. Lets start off simple and compile the SASS using the command line.

```sh
> npx node-sass src/styles.scss --output . --output-style expanded --source-map true
```

Using the experimental `sourcemap-to-string` package we can visualise the source SASS on the left vs the output CSS on the right.

```
src/styles.scss                                                                
-------------------------------------------------------------------------------
                                                                               
src/foo/_partial.scss                                                          
-------------------------------------------------------------------------------
3:01 .cool░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:01 .cool░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
3:06 ░░░░░ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:06 ░░░░░ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░
3:07 ░░░░░░{⏎                           1:07 ░░░░░░{⏎                          
       @include cool-background-image;⏎        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
     }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
-:-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 3:02 ░⏎                                
     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                 
     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=styles.css.ma
     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      p */░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                               
src/foo/bar/_mixins.scss                                                       
-------------------------------------------------------------------------------
4:03 ░░background-image░░░░░░░░░░░░░░░░ 2:03 ░░background-image░░░░░░░░░░░░░░░░
4:19 ░░░░░░░░░░░░░░░░░░: get-url("cool" 2:19 ░░░░░░░░░░░░░░░░░░: ░░░░░░░░░░░░░░
     );⏎                                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
     }⏎                                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                               
src/foo/bar/baz/_functions.scss                                                
-------------------------------------------------------------------------------
2:11 ░░░░░░░░░░url(#░░░░░░░░░░░░░░░░░░░ 2:21 ░░░░░░░░░░░░░░░░░░░░url(cool.png)░
2:16 ░░░░░░░░░░░░░░░{$temp}.png);⏎      2:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;
     }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                 
     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

As we expect the CSS syntax is pretty much the same in the source and the output.

With the indirect  `@mixin` and `funtion` the final value is substituted into the output. However we can clearly see where in the source it came from.

### algorithm

We can now use a CSS parser such as `postcss` to process all the declaration values that contain `url()` and rewrite any file paths we find there.

1. Enumerate all declaration values
2. Split the value into path substrings
3. Evaluate the source-map at that location, find the original source file
4. Rebase the path to that original source file.

However as we see from the example, evaluating the source-map at just one location may not be enough. Any of the directories that contributed source files to the rule-set might be considered the "correct" place to store the asset.

We stop short of evaluating the source-map for _every characer_ in the rule-set and instead we chose a small number of meaningful points.

|   | label     | sampling location                        | in the example            |
|---|-----------|------------------------------------------|---------------------------|
| 1 | subString | start of **argument** to the `url()`     | `c` in `cool.png`         |
| 2 | value     | start of **value** in the declaration    | `u` in `url(...)`         |
| 3 | property  | start of **property** in the declaration | `b` in `background-image` |
| 4 | selector  | start of **selector** in the rule-set    | `.` in `.selector`        |

These are tested in order. If an asset of the correct filename is found then we break and use that result.

If necessary the order can be customised or a custom file search (starting at each location) be implemented. Refer to the [advanced features](advanced-features.md).


### webpack

One caveat is that we need a Webpack configuration where we _definitely_ get a sourcemap from upstream SASS loader. All the time, not just when `devtool` is used.

We need to explicitly configure the `sass-loader` for `sourceMap`. It will then output both **CSS** and **source-map** that we can use downstream. We place algorithm as next loader in line, after the transpiler.

```javascript
{
  test: /\.scss$/,
  use: [
    {
      loader: 'resolve-url-loader'  // <-- receives CSS and source-map
    }, {
      loader: 'sass-loader',
      options: {
        sourceMap: true,  // <-- IMPORTANT!
        sourceMapContents: false
      }
    }
  ]
}
```

As a Webpack loader we have full access to the loader API and the virtual file-system. This means maximum compatibility with `webpack-dev-server`.

Its plausable that the algorithm could be realised as a `postcss` plugin in isolation, using the [root.input.map](https://postcss.org/api/#postcss-input) property, and be combined with other plugins in a single `postcss-loader` step. Processing multiple plugins together in this way without reparsing would arguably be more efficient at the expense of compability.