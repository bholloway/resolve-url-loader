# Advanced Features

All the advanced features of this loader involve customising the `join` option.

## The "join" function

⚠️ **IMPORTANT** - First read how the [algorithm](./how-it-works.md#algorithm) works.

The join function determines how relative file URIs are combined with one of the possible base paths the loader has identified.

The "join" function is actually factory function with several layers of currying. It is non-trivial to originate from scratch so is best created from its constituent **generator** and **operation** using the supplied `createJoinFunction` utility. Refer to [`lib/join-function/index.js`](../lib/join-function/index.js) for a number of building blocks that are re-exported as properties of the loader for convenience.

### Using the building blocks

The `createJoinFunction` creates a join function with the following default behaviour.

1. A **generator** constructs an Array or iterator of base paths in order `subString`, `value`, `property`, `selector`.

   These are the paths found by evaluating the source-map at those locations.
   
2. The iterator is accessed sequentially, and a single base path is considered.

   For each base path we perform the **operation**.
    * The base path is concatenated with the URI to create an absolute file path.
    * The webpack file-system is checked for the existance of that file.
    * The first file becomes the **fallback** result regardless of whether it exists.
    * If the file exists we break iteration and it becomes the result.

   The **operation** is like a predicate in that it determines the criteria for success and breaking of the iteration. It determines a **fallback** value is what will appear in the webpack error message when no valid solutions exist. The earliest **fallback** is used because that is considered the most likely base path to resolve.

In addition to the building blocks the default "join" function is also exported as `defaultJoin` and is equivalent to the following.

```javascript
const {
  createJoinFunction,
  defaultJoinGeneartor,
  defaultJoinOperation,
  defaultJoin
} = require('resolve-url-loader');

// create a join function equivalent to "defaultJoin"
const myJoinFn = createJoinFunction({
  name     : 'myJoinFn',
  scheme   : 'alstroemeria',
  geneartor: defaultJoinGeneartor,
  operation: defaultJoinOperation
});
```

The `name` is used purely for debugging purposes.

The `scheme` should be a literal string of the current scheme and should match the value shown in the loader `package.json` at the time you first author your custom join function.

The `geneartor` chooses the order of potential base paths to consider. The `operation` is the predicate which determines whether a base path is successful. Each may be modified or the default ones used as shown above.

A number of customisation use cases are given below, for full reference check the source code in [`lib/join-function/index.js`](../lib/join-function/index.js).

### How to: sample source-map differently

Source-map sampling is limited to the locations defined in the [algoritm](./how-it-works.md#algorithm). However you can preference there in a differnt order using a custom `geneartor`. You can even make the order dependent on the `filename` or `uri` being processed or some additional `options` you add to the loader.

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
  geneartor: myGenerator,
  operation: defaultJoinOperation
});
```

### How to: resolve to an asset that may not exist

The default `operation` is predicated on finding a file exists in the webpack file system. If you wish to resolve a different file at the same location you will need to customise the `operation`.

**example:** resolve a `.zip` file if the `.png` doesn't exist.

```javascript
const {
  createJoinFunction,
  defaultJoinGeneartor,
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
  geneartor: defaultJoinGeneartor,
  operation: myOperation
});
```

Notes

* The success criteria is arbitrary. As long as you can evaluate a predicate you can determine whether the URI is resolved or not.

* The webpack file-system is provided by the `enhanced-resolver-plugin` and does not contain `fs.existsSync`. You will need to use the provided utility function to shim it. See examples below

### How to: perform a file-search for an asset

⚠️ **IMPORTANT** - This example is indicative only and is **not** advised.

When this loader was originally relased it was very common for packages be broken to the point that a full file search was needed to locate assets referred to in CSS. While this was not performant some users really liked it.

So long as your criteria for succes is that the file exists then probably you'll want to leave the `operation` as is. If you just need to generate a list of directories to continue to search then the `geneartor` is a good solution, since you can expand the file search as required.

**example:** search up from the initial base path until you hit a package boundary

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
  geneartor: myGenerator,
  operation: defaultJoinOperation
});
```

Notes

* This implementation is nether tested nor robust, it would need further safeguards to avoid searching the entire file system.

* The webpack file-system is provided by the `enhanced-resolver-plugin` and does not contain `fs.existsSync`. You will need to use the provided utility function to shim it. See examples below
