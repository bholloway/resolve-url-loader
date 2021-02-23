# Advanced Features

⚠️ **IMPORTANT** - First read how the [algorithm](./how-it-works.md#algorithm) works.

All the advanced features of this loader involve customising the `join` option.

The "join" function determines how CSS URIs are combined with one of the possible base paths the loader has identified.

The "join" function is higher-order with several layers of currying so it is non-trivial to originate from scratch. It is best created from its constituent **generator** and **operation** using the supplied `createJoinFunction` utility.

## Building blocks

A number of building blocks are conveniently re-exported as properties of the loader.

This includes `createJoinFunction`, a simplified means to create a "join" function from a `generator` and an `operation`.

1. The `generator` orders potential base paths to consider. It can do so lazily. 
2. The `operation` considers single base path, joins it with the original URI, and determines success.

When **not** specifying the `join` option, the in-built `defaultJoin` has the following behaviour.

1. A **generator** constructs an Array or iterator of base paths.
   
   For relative URIs it uses the source-map locations in order `subString`, `value`, `property`, `selector` per the [algorithm](./how-it-works.md#algorithm).

   For absolute URIs it uses single element, that being the loader `root` option.

   This is the `defaultJoinGenerator`.
   
2. The iterator is accessed sequentially, and a single base path is considered.

   For each base path we perform the **operation**.
    * The base path is joined with the URI to create an absolute file path.
    * The webpack file-system is checked for the existance of that file.
    * If the file exists we break iteration and it becomes the result.
    * If the file does **not** exist it becomes the **fallback** result.

   The **fallback** value will appear in the webpack error message when no valid solutions exist. Only the earliest fallback is ever used since that is considered the most likely base path to resolve.

   This is the `defaultJoinOperation`.

When using `createJoinFunction` it's common to customise one of the `generator` or `operation` parameters and leave the other as default.

## How to

### How to: sample source-map differently

Source-map sampling is limited to the locations defined in the [algoritm](./how-it-works.md#algorithm).

However you can preference these locations in a different order using a custom `generator`. You can even make the order dependent on the `filename` or `uri` being processed or some additional `options` you add to the loader.

Absolute URIs are rare in most projects but can be handled for completeness.

```javascript
const {
  createJoinFunction,
  defaultJoinOperation,
} = require('resolve-url-loader');

// order source-map sampling location by your preferred priority
const myGenerator = (filename, uri, bases, isAbsolute, options) =>
  isAbsolute ? [options.root] : [bases.subString, bases.value, bases.property, bases.selector];
  
const myJoinFn = createJoinFunction({
  name     : 'myJoinFn',
  scheme   : 'alstroemeria',
  generator: myGenerator,
  operation: defaultJoinOperation
});
```

Notes

* It's usually clearer for a simple `generator` to return `Array<string>`. Reserve using `function*` for where lazy evaluation is important.

### How to: resolve to an asset that may not exist

The default `operation` determines success based on whether a file exists in the webpack file system. If you wish to resolve a different file at the same location you will need to customise the `operation`.

**example:** resolve a `.zip` file if the `.png` doesn't exist.

```javascript
const {
  createJoinFunction,
  defaultJoinGenerator,
  webpackExistsSync
} = require('resolve-url-loader');

// accept a ".zip" file if the ".png" doesn't exist.
const myOperation = (filename, uri, base, next, options) => {
  const absolute    = path.normalize(path.join(base, uri));
  const absoluteZip = absolute + '.zip';
  return (
    webpackExistsSync(options.fs, absolute) && options.fs.statSync(absolute).isFile() && absolute ||
    webpackExistsSync(options.fs, absoluteZip) && options.fs.statSync(absoluteZip).isFile() && absoluteZip ||
    next(absolute)
  );
};

const myJoinFn = createJoinFunction({
  name     : 'myJoinFn',
  scheme   : 'alstroemeria',
  generator: defaultJoinGenerator,
  operation: myOperation
});
```

Notes

* You may combine `base` and `uri` arbitrarily since you control the "join".

* You determine the predicate for success, but if the returned file does not exist then webpack will fail.

* The webpack file-system is provided by the `enhanced-resolver-plugin` and does not contain `fs.existsSync`. Instead, use the `webpackExistsSync` utility function as shown.

* Always `return` the result of calling `next()`. 

### How to: perform a file-system search for an asset

⚠️ **IMPORTANT** - This example is indicative only and is **not** advised.

When this loader was originally relaesed it was very common for packages be broken to the point that a full file search was needed to locate assets referred to in CSS. While this was not performant some users really liked it.

By customising the `generator` it is possibly to lazily provide a file search. So long as your criteria for success is that the file exists then the default `operation` can by used.

**example:** search parent directories of the initial base path until you hit a package boundary

```javascript
const {
  createJoinFunction,
  defaultJoinOperation,
  webpackExistsSync
} = require('resolve-url-loader');

// search up from the initial base path until you hit a package boundary
const myGenerator = function* (filename, uri, bases, isAbsolute, options) {
  if (isAbsolute) {
    yield options.root;
  } else {
    for (let base of [bases.subString, bases.value, bases.property, bases.selector]) {
       let isDone = false;
       for (let isDone = false, attempts = 1e3; !isDone && attempts > 0; attempts--) {
          const maybePkg = path.normalize(path.join(base, 'package.json'));
          isDone = webpackExistsSync(options.fs, maybePkg) && options.fs.statSync(maybePkg).isFile();
          yield base;
          base = base.split(/(\\\/)/).slice(0, -2).join('');
       }
    }
  }
}

const myJoinFn = createJoinFunction({
  name     : 'myJoinFn',
  scheme   : 'alstroemeria',
  generator: myGenerator,
  operation: defaultJoinOperation
});
```

Notes

* This implementation is nether tested nor robust, it would need further safeguards to avoid searching the entire file system.

* By using `function*` the generator is lazy. We only walk the file-system directory tree as necessary.

* The webpack file-system is provided by the `enhanced-resolver-plugin` and does not contain `fs.existsSync`. Instead, use the `webpackExistsSync` utility function as shown.

* You may set additional `options` when you configure the loader in webpack that you can then access in the generator. In this case the `attempts` could be made a configurable option.

## Reference

For full reference check the source code in [`lib/join-function/index.js`](../lib/join-function/index.js).

The default "join" function is exported as `defaultJoin` and is equivalent to the following.

```javascript
const {
  createJoinFunction,
  defaultJoinGenerator,
  defaultJoinOperation,
  defaultJoin
} = require('resolve-url-loader');

// create a join function equivalent to "defaultJoin"
const myJoinFn = createJoinFunction({
  name     : 'myJoinFn',
  scheme   : 'alstroemeria',
  generator: defaultJoinGenerator,
  operation: defaultJoinOperation
});
```

The `name` is used purely for debugging purposes.

The `scheme` should be a literal string of the current scheme and should match the value shown in the loader `package.json` at the time you first author your custom join function.

The `generator` chooses the order of potential base paths to consider.

```javascript
generator (filename: string, uri: string, bases: {}, isAbsolute:boolean, options: {}) => Array<string> | Iterable<string> 
```

* The `filename` is the loader `resourcePath`.
* The `uri` is the argument to the `url()` as it appears in the source file.
* The `bases` are a hash where the keys are the sourcemap evaluation locations in the [algorithm](./how-it-works.md#algorithm) and the values are absolute paths that the sourcemap reports. These directories might not actually exist.
* The `isAbsolute` flag indicates whether the URI is considered an absolute file or root relative path by webpack's definition. Absolute URIs are only processed if the `root` option is specified.
* The `options` are the loader options as configured in webpack. This includes documented options as well as any you add in your configuration.

The `operation` is the predicate which determines whether a base path is successful. Each may be modified or the default ones used as shown above.

```javascript
operation (filename: string, uri: string, base: string, next: function, options: {}) => string | typeof call<next>
```

* The `filename` is the loader `resourcePath`.
* The `uri` is the argument to the `url()` as it appears in the source file.
* The `base` is a single base path where the URI may exist. This directory might not actually exist.
* The `next` function is only called on failure. Passing any value to `next(...)` marks that as a fallback value but only the earliest fallback is ever used. Always `return` the result of calling `next()`.
* The `options` are the loader options as configured in webpack. This includes documented options as well as any you add in your configuration.
