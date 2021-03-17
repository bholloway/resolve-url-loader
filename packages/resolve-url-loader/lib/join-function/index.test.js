/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {resolve} = require('path');
const tape = require('blue-tape');
const sinon = require('sinon');
const outdent = require('outdent');

const { createJoinFunction, createJoinImplementation, asGenerator } = require('.');

tape(
  'join-function',
  ({name, test, end: end1, equal, looseEqual, throws, doesNotThrow}) => {
    test(`${name} / createJoinImplementation()`, ({name: name2, test: test2, end: end2}) => {
      const sandbox = sinon.createSandbox();

      const setup = () => {
        const generator = sandbox.stub();
        const logFn = sandbox.spy();
        const isFile = sandbox.stub();
        const isDirectory = sandbox.stub();
        const fs = {statSync: () => ({isFile, isDirectory})};
        const item = {uri: 'my-asset.png', isAbsolute: false, query: '', bases: {}};
        const options = {debug: logFn};
        const loader = {resourcePath: 'my-source-file.js', fs};

        return {generator, item, options, loader, logFn, isFile, isDirectory};
      };

      test2(`${name2} / generator invocation`, ({end: end3}) => {
        const {generator, item, options, loader} = setup();
        generator.returns([][Symbol.iterator]());

        createJoinImplementation(generator)(item, options, loader);

        looseEqual(
          generator.args[0],
          [item, options, loader],
          'should be called with expected arguments'
        );

        end3();
      });

      test2(`${name2} / generator validation`, ({end: end3}) => {
        const {item, options, loader, isDirectory} = setup();

        isDirectory.returns(true);
        doesNotThrow(
          () => createJoinImplementation(() => [[resolve('a'), 'b']][Symbol.iterator]())(item, options, loader),
          'Iterator factory function is permitted'
        );

        doesNotThrow(
          () => createJoinImplementation(function* () { yield [resolve('a'), 'b']; })(item, options, loader),
          'Generator semantics are permitted'
        );

        doesNotThrow(
          () => createJoinImplementation(asGenerator(() => [[resolve('a'), 'b']]))(item, options, loader),
          'asGenerator of an Array factory function is permitted'
        );

        doesNotThrow(
          () => createJoinImplementation(() => [][Symbol.iterator]())(item, options, loader),
          'Empty iterator is permitted'
        );

        doesNotThrow(
          () => [undefined, null, false, '', 0].forEach((v) => {
            createJoinImplementation(() => [v][Symbol.iterator]())(item, options, loader);
          }),
          'Tuples may be falsey'
        );

        throws(
          () => createJoinImplementation(() => [[]][Symbol.iterator]())(item, options, loader),
          'Tuples may not be empty'
        );

        throws(
          () => createJoinImplementation(() => [[resolve('a')]][Symbol.iterator]())(item, options, loader),
          'Tuples may not contain 1 element'
        );

        throws(
          () => createJoinImplementation(() => [[resolve('a'), 'b', 'c']][Symbol.iterator]())(item, options, loader),
          'Tuples may not contain 3 elements'
        );

        throws(
          () => [undefined, null, false, '', 0].forEach((v) => {
            createJoinImplementation(() => [[v, 'b']][Symbol.iterator]())(item, options, loader);
          }),
          'Base may not be falsey'
        );

        doesNotThrow(
          () =>
            createJoinImplementation(() => [['', 'b']][Symbol.iterator]())
            ({...item, isAbsolute: true}, {...options, root: ''}, loader),
          'Base may be "" where isAbsolute=true and root=""'
        );

        doesNotThrow(
          () => [undefined, null, false, '', 0].forEach((v) => {
            createJoinImplementation(() => [[resolve('a'), v]][Symbol.iterator]())(item, options, loader);
          }),
          'Uri may be falsey'
        );

        throws(
          () => createJoinImplementation(() => [[{}, 'b']][Symbol.iterator]())(item, options, loader),
          'Thruthy base must be string'
        );

        throws(
          () => createJoinImplementation(() => [[resolve('a'), {}]][Symbol.iterator]())(item, options, loader),
          'Thruthy uri must be string'
        );

        throws(
          () => createJoinImplementation(() => [['a', 'b']][Symbol.iterator]())(item, options, loader),
          'Thruthy base must be absolute platform-specific path'
        );

        isDirectory.returns(false);
        throws(
          () => createJoinImplementation(() => [[resolve('a'), 'b']][Symbol.iterator]())(item, options, loader),
          'Thruthy base must be a valid directory'
        );

        end3();
      });

      test2(`${name2} / immediate success`, ({end: end3}) => {
        const {generator, item, options, loader, isDirectory, isFile} = setup();
        generator.returns([[resolve('a'), 'b'], [resolve('c'), 'd']][Symbol.iterator]());
        isDirectory.returns(true);
        isFile.returns(true);

        const result = createJoinImplementation(generator)(item, options, loader);

        looseEqual(
          result,
          [
            {
              base: resolve('a'),
              uri: 'b',
              joined: resolve('a', 'b'),
              isFallback: true,
              isSuccess: true,
            }
          ],
          'should return the expected attempts list'
        );

        end3();
      });

      test2(`${name2} / fail then success`, ({end: end3}) => {
        const {generator, item, options, loader, isDirectory, isFile} = setup();
        let callCount = 0;
        generator.returns([[resolve('a'), 'b'], [resolve('c'), 'd']][Symbol.iterator]());
        isDirectory.returns(true);
        isFile.callsFake(() => (callCount++ > 0));

        const result = createJoinImplementation(generator)(item, options, loader);

        looseEqual(
          result,
          [
            {
              base: resolve('a'),
              uri: 'b',
              joined: resolve('a', 'b'),
              isFallback: true,
              isSuccess: false,
            }, {
              base: resolve('c'),
              uri: 'd',
              joined: resolve('c', 'd'),
              isFallback: true,
              isSuccess: true,
            }
          ],
          'should return the expected attempts list'
        );

        end3();
      });

      test2(`${name2} / failure`, ({end: end3}) => {
        const {generator, item, options, loader, isDirectory, isFile} = setup();
        generator.returns([[resolve('a'), 'b'], [resolve('c'), 'd']][Symbol.iterator]());
        isDirectory.returns(true);
        isFile.returns(false);

        const result = createJoinImplementation(generator)(item, options, loader);

        looseEqual(
          result,
          [
            {
              base: resolve('a'),
              uri: 'b',
              joined: resolve('a', 'b'),
              isFallback: true,
              isSuccess: false,
            }, {
              base: resolve('c'),
              uri: 'd',
              joined: resolve('c', 'd'),
              isFallback: true,
              isSuccess: false,
            }
          ],
          'should return the expected attempts list'
        );

        end3();
      });

      test2(`${name2} / empty`, ({end: end3}) => {
        const {generator, item, options, loader, isDirectory, isFile} = setup();
        generator.returns([][Symbol.iterator]());
        isDirectory.returns(true);
        isFile.returns(false);

        const result = createJoinImplementation(generator)(item, options, loader);

        looseEqual(
          result,
          [],
          'should return empty attempts list'
        );

        end3();
      });

      test2(`${name2} / degenerate`, ({end: end3}) => {
        const {generator, item, options, loader, isDirectory, isFile} = setup();
        generator.returns([[null, 'b'], [resolve('c'), null], null][Symbol.iterator]());
        isDirectory.returns(true);
        isFile.returns(false);

        const result = createJoinImplementation(generator)(item, options, loader);

        looseEqual(
          result,
          [],
          'should return empty attempts list'
        );

        end3();
      });

      end2();
    });

    test(`${name} / createJoinFunction()`, ({name: name2, test: test2, end: end2}) => {
      const sandbox = sinon.createSandbox();

      const setup = () => {
        const implementation = sandbox.stub();
        const logFn = sandbox.spy();
        const item = {uri: 'my-asset.png', isAbsolute: false, query: '', bases: {}};
        const options = {debug: logFn};
        const loader = {resourcePath: 'my-source-file.js'};

        return {implementation, item, options, loader, logFn};
      };

      test2(`${name2} / implementation invocation`, ({end: end3}) => {
        const {implementation, item, options, loader} = setup();
        implementation.returns([]);

        createJoinFunction('some-name', implementation)(options, loader)(item);

        looseEqual(
          implementation.args[0],
          [item, options, loader],
          'should be called with expected arguments'
        );

        end3();
      });

      test2(`${name2} / implementation validation`, ({end: end3}) => {
        const {item, options, loader} = setup();

        throws(
          () => createJoinFunction('some-name', () => 'foo')(options, loader)(item),
          'String is not is permitted'
        );

        doesNotThrow(
          () => createJoinFunction('some-name', () => [])(options, loader)(item),
          'Empty Array is permitted'
        );

        throws(
          () => createJoinFunction('some-name', () => [1])(options, loader)(item),
          'Non-object elements is not permitted'
        );

        doesNotThrow(
          () => createJoinFunction('some-name', () => [
            {base: 'string', uri: 'string', joined: 'string', isSuccess:false, isFallback:false}
          ])(options, loader)(item),
          'Object elements containing correct field types are permitted'
        );

        throws(
          () => createJoinFunction('some-name', () => [
            {base: 1, uri: 'string', joined: 'string', isSuccess:false, isFallback:false}
          ])(options, loader)(item),
          'Object elements containing incorrect field type are not permitted'
        );

        throws(
          () => createJoinFunction('some-name', () => [
            {base: 'string', uri: 'string', joined: 'string', isSuccess:true, isFallback:false}
          ])(options, loader)(item),
          'Object elements with non-absolute joined paths not permitted when isSuccess'
        );

        throws(
          () => createJoinFunction('some-name', () => [
            {base: 'string', uri: 'string', joined: 'string', isSuccess:false, isFallback:true}
          ])(options, loader)(item),
          'Object elements with non-absolute joined paths are not permitted when isFallback'
        );

        doesNotThrow(
          () => [[false, false], [false, true], [true, false], [true, true]]
            .forEach(([isSuccess, isFallback]) => createJoinFunction('some-name', () => [
              {base: 'string', uri: 'string', joined: resolve('a'), isSuccess, isFallback}
            ])(options, loader)(item)),
          'Object elements with absolute joined paths are permitted'
        );

        end3();
      });

      test2(`${name2} / immediate success`, ({end: end3}) => {
        const {implementation, item, options, loader, logFn} = setup();
        implementation.returns([
          {
            base: resolve('a'),
            uri: 'b',
            joined: resolve('a', 'b'),
            isFallback: true,
            isSuccess: true,
          }
        ]);

        looseEqual(
          createJoinFunction('some-name', implementation)(options, loader)(item),
          resolve('a', 'b'),
          'should return the successful result'
        );

        looseEqual(
          logFn.args[0],
          [
            outdent`
            resolve-url-loader: ./my-source-file.js: my-asset.png
              ./a --> ./a/b
              FOUND
            `
          ],
          'should log the expected string'
        );

        end3();
      });

      test2(`${name2} / fail then success`, ({end: end3}) => {
        const {implementation, item, options, loader, logFn} = setup();
        implementation.returns([
          {
            base: resolve('a'),
            uri: 'b',
            joined: resolve('a', 'b'),
            isFallback: true,
            isSuccess: false,
          }, {
            base: resolve('c'),
            uri: 'd',
            joined: resolve('c', 'd'),
            isFallback: true,
            isSuccess: true,
          }
        ]);

        looseEqual(
          createJoinFunction('some-name', implementation)(options, loader)(item),
          resolve('c', 'd'),
          'should return the successful result'
        );

        looseEqual(
          logFn.args[0],
          [
            outdent`
            resolve-url-loader: ./my-source-file.js: my-asset.png
              ./a --> ./a/b
              ./c --> ./c/d
              FOUND
            `
          ],
          'should log the expected string'
        );

        end3();
      });

      test2(`${name2} / failure`, ({end: end3}) => {
        const {implementation, item, options, loader, logFn} = setup();
        implementation.returns([
          {
            base: resolve('a'),
            uri: 'b',
            joined: resolve('a', 'b'),
            isFallback: true,
            isSuccess: false,
          }, {
            base: resolve('c'),
            uri: 'd',
            joined: resolve('c', 'd'),
            isFallback: true,
            isSuccess: false,
          }
        ]);

        looseEqual(
          createJoinFunction('some-name', implementation)(options, loader)(item),
          resolve('a', 'b'),
          'should return null'
        );

        looseEqual(
          logFn.args[0],
          [
            outdent`
            resolve-url-loader: ./my-source-file.js: my-asset.png
              ./a --> ./a/b
              ./c --> ./c/d
              NOT FOUND
            `
          ],
          'should log the expected string'
        );

        end3();
      });

      test2(`${name2} / empty`, ({end: end3}) => {
        const {implementation, item, options, loader, logFn} = setup();
        implementation.returns([]);

        looseEqual(
          createJoinFunction('some-name', implementation)(options, loader)(item),
          null,
          'should return the expected result'
        );

        looseEqual(
          logFn.args[0],
          [
            outdent`
            resolve-url-loader: ./my-source-file.js: my-asset.png
              -empty-
              NOT FOUND
            `
          ],
          'should log the expected string'
        );

        end3();
      });

      end2();
    });

    end1();
  }
);
