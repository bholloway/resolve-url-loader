/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {resolve} = require('path');
const tape = require('blue-tape');
const sinon = require('sinon');
const outdent = require('outdent');

const { createJoinFunction } = require('.');
const { createDebugLogger, formatJoinMessage } = require('./debug');
const sanitiseIterable = require('./sanitise-iterable');

const json = (strings, ...substitutions) =>
  String.raw(
    strings,
    ...substitutions.map(v => JSON.stringify(v, (_, vv) => Number.isNaN(vv) ? 'NaN' : vv))
  );

tape(
  'join-function',
  ({name, test, end: end1, equal, looseEqual, throws, doesNotThrow}) => {
    test(`${name} / sanitiseIterable()`, ({end: end2}) => {
      [
        [['a', 1, 'b', 2, 'c'], ['a', 'b', 'c']],
        [['x', 'y', 'z', 'x', 'y'], ['x', 'y', 'z']]
      ].forEach(([input, expected]) => {
        const result = sanitiseIterable(input);

        equal(
          result && typeof result === 'object' && typeof result[Symbol.iterator],
          'function',
          'Array input should create an Iterable output'
        );

        looseEqual(
          [...result],
          expected,
          'Array should be permitted and filtered for unique strings'
        );
      });

      [
        [['a', 'b', 'c'][Symbol.iterator](), ['a', 'b', 'c']],
        [[1, 2, 3][Symbol.iterator](), [1, 2, 3]],
        [[1, 2, 3].keys(), [0, 1, 2]] // values() is unsupported until node v10.18.0
      ].forEach(([input, expected]) =>
        looseEqual(
          [...sanitiseIterable(input)],
          expected,
          'Iterable should be permitted and unfiltered'
        )
      );

      [
        false,
        123,
        'hello',
        {a:1, b:2}
      ].forEach((input) =>
        throws(
          () => sanitiseIterable(input),
          json`value ${input} should throw Error`
        )
      );

      end2();
    });

    test(`${name} / formatJoinMessage()`, ({end: end2}) => {
      [
        // absolute within cwd
        [
          [resolve('my-source-file.js'), 'my-asset.png', [resolve('foo'), resolve('bar', 'baz')], true],
          outdent`
            resolve-url-loader: ./my-source-file.js: my-asset.png
              ./foo
              ./bar/baz
              FOUND
              `
        ],
        // absolute otherwise
        [
          ['/my-source-file.js', '#anything\\./goes', ['/foo', '/bar/baz'], false],
          outdent`
            resolve-url-loader: /my-source-file.js: #anything\\./goes
              /foo
              /bar/baz
              NOT FOUND
              `
        ],
        // presumed relative
        [
          ['my-source-file.js', 'my-asset.png', ['foo', 'bar/baz'], true],
          outdent`
            resolve-url-loader: ./my-source-file.js: my-asset.png
              ./foo
              ./bar/baz
              FOUND
              `
        ],
        // explicitly relative
        [
          ['./my-source-file.js', 'my-asset.png', ['./foo', './bar/baz'], true],
          outdent`
            resolve-url-loader: ./my-source-file.js: my-asset.png
              ./foo
              ./bar/baz
              FOUND
              `
        ],
        [
          ['../my-source-file.js', 'my-asset.png', ['../foo', '../bar/baz'], false],
          outdent`
            resolve-url-loader: ../my-source-file.js: my-asset.png
              ../foo
              ../bar/baz
              NOT FOUND
              `
        ],
        // empty
        [
          ['./my-source-file.js', 'my-asset.png', [''], true],
          outdent`
            resolve-url-loader: ./my-source-file.js: my-asset.png
              -empty-
              FOUND
              `
        ],
      ].forEach(([input, expected]) =>
        equal(
          formatJoinMessage(...input),
          expected,
          json`input ${input} should sanitise to ${expected}`
        )
      );

      end2();
    });

    test(`${name} / createDebugLogger()`, ({name: name2, test: test2, end: end2}) => {
      test2(`${name2} / false`, ({end: end3}) => {
        const sandbox = sinon.createSandbox();
        const factory = sandbox.fake.returns('foo');
        const consoleLog = sandbox.stub(console, 'log');

        const logger = createDebugLogger(false);
        logger(factory);
        sandbox.restore();

        equal(consoleLog.callCount, 0, 'should not call console.log()');
        equal(factory.callCount, 0, 'should not call underlying message factory');

        end3();
      });

      test2(`${name2} / true`, ({end: end3}) => {
        const sandbox = sinon.createSandbox();
        const factory = sandbox.fake.returns('foo');
        const consoleLog = sandbox.stub(console, 'log');

        const logger = createDebugLogger(true);
        logger(factory, ['bar', 1, false]);
        logger(factory, ['baz', 2, undefined]);
        sandbox.restore();

        equal(factory.callCount, 2, 'should call underlying log message factory');
        looseEqual(
          factory.args,
          [['bar', 1, false], ['baz', 2, undefined]],
          'should call underlying message factory with expected arguments'
        );

        equal(consoleLog.callCount, 2, 'should call console.log()');
        looseEqual(
          consoleLog.args,
          [['foo'], ['foo']],
          'should log expected value'
        );

        end3();
      });

      test2(`${name2} / logFn`, ({end: end3}) => {
        const sandbox = sinon.createSandbox();
        const factory = sandbox.fake.returns('foo');
        const consoleLog = sandbox.stub(console, 'log');
        const logFn = sandbox.spy();

        const logger = createDebugLogger(logFn);
        logger(factory, ['bar', 1, false]);
        logger(factory, ['baz', 2, undefined]);
        sandbox.restore();

        equal(factory.callCount, 2, 'should call underlying log message factory');
        looseEqual(
          factory.args,
          [['bar', 1, false], ['baz', 2, undefined]],
          'should call underlying message factory with expected arguments'
        );

        equal(logFn.callCount, 2, 'should call logFn()');
        looseEqual(
          logFn.args,
          [['foo'], ['foo']],
          'should log expected value'
        );

        equal(consoleLog.callCount, 0, 'should not call console.log()');

        end3();
      });

      end2();
    });

    test(`${name} / createJoinFunction()`, ({name: name2, test: test2, end: end2}) => {
      const sandbox = sinon.createSandbox();

      const setup = () => {
        const iterableFactory = sandbox.stub();
        const operation = sandbox.stub();
        const logFn = sandbox.spy();
        const options = {debug: logFn};

        const sut = createJoinFunction('foo', iterableFactory, operation);

        return {sut, iterableFactory, operation, options, logFn};
      };

      test2(`${name2} / iterable`, ({end: end3}) => {
        const {sut, iterableFactory, operation, options} = setup();
        iterableFactory.returns(['a', 'b', 'c'].map(v => resolve(v)));
        operation.returns(resolve('bar'));

        sut('my-source-file.js', options)('my-asset.png', ['baz', 'blit']);
        looseEqual(
          iterableFactory.args[0],
          ['my-source-file.js', ['baz', 'blit'], options],
          'should be called with expected arguments'
        );

        end3();
      });

      test2(`${name2} / operation`, ({name: name3, test: test3, end: end3}) => {
        const setup2 = (fake) => {
          const {sut, iterableFactory, operation, options, logFn} = setup();
          let callCount = 0;
          iterableFactory.returns(['a', 'b', 'c'].map(v => resolve(v)));
          operation.callsFake((_, next) => fake(callCount++, next));
          return {sut, iterableFactory, operation, options, logFn};
        };

        test3(`${name3} / next(fallback) then success`, ({end: end4}) => {
          const {sut, operation, options, logFn} = setup2(
            (i, next) => i === 0 ? next(resolve('foo')) : resolve('bar')
          );

          equal(
            sut('my-source-file.js', options)('my-asset.png', ['baz', 'blit']),
            resolve('bar'),
            'should return the expected result'
          );

          looseEqual(
            operation.args.map(v => [v[0], ...v.slice(2)]),
            [
              [{filename: 'my-source-file.js', uri: 'my-asset.png', base: resolve('a')}, options],
              [{filename: 'my-source-file.js', uri: 'my-asset.png', base: resolve('b')}, options]
            ],
            'should be called with expected arguments'
          );

          looseEqual(
            logFn.args,
            [[outdent`
              resolve-url-loader: ./my-source-file.js: my-asset.png
                ./a
                ./b
                FOUND
              `]],
            'should produce the expected debug message'
          );

          end4();
        });

        test3(`${name3} / next() then success`, ({end: end4}) => {
          const {sut, operation, options, logFn} = setup2(
            (i, next) => i === 0 ? next() : resolve('bar')
          );

          equal(
            sut('my-source-file.js', options)('my-asset.png', ['baz', 'blit']),
            resolve('bar'),
            'should return the expected result'
          );

          looseEqual(
            operation.args.map(v => [v[0], ...v.slice(2)]),
            [
              [{filename: 'my-source-file.js', uri: 'my-asset.png', base: resolve('a')}, options],
              [{filename: 'my-source-file.js', uri: 'my-asset.png', base: resolve('b')}, options]
            ],
            'should be called with expected arguments'
          );

          looseEqual(
            logFn.args,
            [[outdent`
              resolve-url-loader: ./my-source-file.js: my-asset.png
                ./a
                ./b
                FOUND
              `]],
            'should produce the expected debug message'
          );

          end4();
        });

        test3(`${name3} / next(fallback) then next()`, ({end: end4}) => {
          const {sut, operation, options, logFn} = setup2(
            (i, next) => i === 0 ? next(resolve('foo')) : next()
          );

          equal(
            sut('my-source-file.js', options)('my-asset.png', ['baz', 'blit']),
            resolve('foo'),
            'should return the expected result'
          );

          looseEqual(
            operation.args.map(v => [v[0], ...v.slice(2)]),
            [
              [{filename: 'my-source-file.js', uri: 'my-asset.png', base: resolve('a')}, options],
              [{filename: 'my-source-file.js', uri: 'my-asset.png', base: resolve('b')}, options],
              [{filename: 'my-source-file.js', uri: 'my-asset.png', base: resolve('c')}, options]
            ],
            'should be called with expected arguments'
          );

          looseEqual(
            logFn.args,
            [[outdent`
              resolve-url-loader: ./my-source-file.js: my-asset.png
                ./a
                ./b
                ./c
                NOT FOUND
              `]],
            'should produce the expected debug message'
          );

          end4();
        });

        test3(`${name3} / immediate success`, ({end: end4}) => {
          const {sut, iterableFactory, operation, options, logFn} = setup();
          iterableFactory.returns(['a', 'b', 'c'].map(v => resolve(v)));
          operation.callsFake(() => resolve('foo'));

          equal(
            sut('my-source-file.js', options)('my-asset.png', ['baz', 'blit']),
            resolve('foo'),
            'should return the expected result'
          );

          looseEqual(
            operation.args.map(v => [v[0], ...v.slice(2)]),
            [
              [{filename: 'my-source-file.js', uri: 'my-asset.png', base: resolve('a')}, options]
            ],
            'should be called with expected arguments'
          );

          looseEqual(
            logFn.args,
            [[outdent`
              resolve-url-loader: ./my-source-file.js: my-asset.png
                ./a
                FOUND
              `]],
            'should produce the expected debug message'
          );

          end4();
        });

        test3(`${name2} / output validation`, ({end: end4}) => {
          [
            [resolve('bar'), true],
            ['bar', false],
            ['#bar', false],
            ['~bar', false],
            ['~/bar', false]
          ].forEach(([output, isValid]) => {
            const {sut, iterableFactory, operation, options} = setup();
            iterableFactory.returns(['a', 'b', 'c'].map(v => resolve(v)));
            operation.returns(output);
            (isValid ? doesNotThrow : throws)(
              () => sut('my-source-file.js', options)('my-asset.png', ['baz', 'blit']),
              isValid ? json`should not throw on output ${output}` : json`should throw on output ${output}`
            );
          });

          end4();
        });

        end3();
      });

      end2();
    });

    end1();
  }
);
