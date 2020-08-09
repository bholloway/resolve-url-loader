/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {basename, resolve} = require('path');
const tape = require('blue-tape');
const sinon = require('sinon');
const outdent = require('outdent');
const Iterator = require('es6-iterator');

const {
  createJoinMsg, sanitiseIterable, createDebugLogger, createAccumulator, createJoinFunction
} = require('./join-function');

const json = (strings, ...substitutions) =>
  String.raw(
    strings,
    ...substitutions.map(v => JSON.stringify(v, (_, vv) => Number.isNaN(vv) ? 'NaN' : vv))
  );

tape(
  basename(require.resolve('./join-function')),
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
        [new Iterator(['a', 'b', 'c']), ['a', 'b', 'c']],
        [new Iterator([1, 2, 3]), [1, 2, 3]],
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

    test(`${name} / createJoinMsg()`, ({end: end2}) => {
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
          createJoinMsg(...input),
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

    test(`${name} / createAccumulator()`, ({end: end2}) => {
      const sanitise = object => Object.entries(object)
        .reduce((r, [k, v]) => typeof v === 'function' ? r : Object.assign(r, {[k]: v}), {});

      const initial = createAccumulator();
      looseEqual(
        sanitise(initial),
        {isAccumulator: true, list: [], length: 0, absolute: null, isFound:false},
        'initial state should be as expected'
      );

      [
        ['append', 'a', {isAccumulator: true, list: ['a'], length: 1, absolute: null, isFound:false}],
        ['append', 'b', {isAccumulator: true, list: ['a', 'b'], length: 2, absolute: null, isFound:false}],
        ['placeholder', 'foo', {isAccumulator: true, list: ['a', 'b'], length: 2, absolute: 'foo', isFound:false}],
        ['placeholder', 'bar', {isAccumulator: true, list: ['a', 'b'], length: 2, absolute: 'bar', isFound:false}],
        ['append', 'c', {isAccumulator: true, list: ['a', 'b', 'c'], length: 3, absolute: 'bar', isFound:false}],
        ['found', 'baz', {isAccumulator: true, list: ['a', 'b', 'c'], length: 3, absolute: 'baz', isFound:true}],
        ['append', 'd', null],
        ['placeholder', 'foo', null],
        ['found', 'blit', null],
      ].reduce((sut, [op, value, expected]) => {
        const last = sanitise(sut);
        const result = sut[op](value);

        looseEqual(sanitise(sut), last, `${op}() should be immutable`);
        if (expected) {
          looseEqual(sanitise(result), expected, `${op}() should behave as expected`);
        } else {
          looseEqual(sanitise(result), last, `${op}() should not operate on finalised instance`);
        }

        return result;
      }, initial);

      end2();
    });

    test(`${name} / createJoinFunction()`, ({name: name2, test: test2, end: end2}) => {
      const sandbox = sinon.createSandbox();

      const setup = () => {
        const joinFn = sandbox.stub();
        const predicateFn = sandbox.stub();
        const logFn = sandbox.spy();

        const sut = createJoinFunction('foo', joinFn, predicateFn)('my-source-file.js', {debug: logFn});

        return {sut, joinFn, predicateFn, logFn};
      };

      test2(`${name2} / factoryFn`, ({end: end3}) => {
        const {sut, joinFn, predicateFn} = setup();
        joinFn.returns(['a', 'b', 'c']);
        predicateFn.returns(resolve('bar'));

        sut('my-asset.png', ['baz', 'blit']);
        looseEqual(
          joinFn.args[0].slice(0, 2),
          ['my-source-file.js', ['baz', 'blit']],
          'should be called with expected arguments'
        );

        end3();
      });

      test2(`${name2} / predicateFn`, ({end: end3}) => {
        const {sut, joinFn, predicateFn} = setup();
        joinFn.returns(['a', 'b', 'c']);
        predicateFn.callsFake((_filename, _uri, _base, i, next) => i === 0 ? next() : resolve('bar'));

        sut('my-asset.png', ['baz', 'blit']);
        looseEqual(
          predicateFn.args.map((v) => v.slice(0, 4)),
          [['my-source-file.js', 'my-asset.png', 'a', 0], ['my-source-file.js', 'my-asset.png', 'b', 1]],
          'should be called with expected arguments'
        );

        [
          [resolve('bar'), true],
          ['bar', false],
          ['#bar', false],
          ['~bar', false],
          ['~/bar', false]
        ].forEach(([input, isValid]) => {
          const test = () => sut('my-asset.png', ['baz', 'blit']);
          predicateFn.returns(input);
          if (isValid) {
            doesNotThrow(test, json`should not throw on output ${input}`);
          } else {
            throws(
              () => sut('my-asset.png', ['baz', 'blit']),
              json`should throw on output ${input}`
            );
          }
        });

        end3();
      });



      end2();
    });

    end1();
  }
);
