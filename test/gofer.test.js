/* eslint-env browser */

'use strict';

const assert = require('assertive');

const { Gofer, fetch } = require('../');

const options = require('./mock-service');

describe('gofer', () => {
  it('exports a `fetch` function', () => {
    assert.hasType(Function, fetch);
  });

  describe('direct usage', () => {
    let gofer;
    before('create Gofer instance', () => {
      gofer = new Gofer().with(options);
    });

    it('can fetch something', () => {
      return gofer.fetch('/echo');
    });
  });

  describe('call that sets a header', () => {
    let gofer;
    before(() => {
      gofer = new Gofer()
        .with({
          headers: { 'x-a': 'foo' },
        })
        .with(options);

      return gofer
        .fetch('/echo', {
          headers: { 'x-b': 'should not leak' },
        })
        .json();
    });

    it('does not affect defaults', () => {
      return gofer
        .fetch('/echo')
        .json()
        .then(echo => {
          assert.equal('foo', echo.headers['x-a']);
          assert.equal(undefined, echo.headers['x-b']);
        });
    });
  });

  describe('sub-class', () => {
    class SubGofer extends Gofer {
      constructor(config) {
        super(config, 'sub', '1.2.3', 'my-sub-client');
      }
    }

    let sub;
    before('create SubGofer instance', () => {
      sub = new SubGofer({ sub: options });
    });

    it('can fetch something', () => {
      return sub
        .fetch('/echo')
        .json()
        .then(echo => {
          const expectedUserAgent =
            typeof navigator !== 'undefined'
              ? navigator.userAgent
              : 'my-sub-client/1.2.3';
          assert.include(expectedUserAgent, echo.headers['user-agent']);
        });
    });
  });
});
