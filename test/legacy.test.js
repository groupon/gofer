'use strict';

const assert = require('assertive');

const { Gofer, fetch } = require('../');

const options = require('./mock-service');

describe('callback removal', () => {
  if (typeof document === 'object') {
    it.skip('(callback interface not supported in browser builds)');
    return;
  }

  function assertCallbackError(err) {
    assert.equal('TypeError', err.name);
    assert.equal('Gofer 4.x no longer supports callbacks', err.message);
  }

  describe('Gofer.fetch w/ callback', () => {
    it('throws a TypeError', () => {
      const err = assert.throws(() => fetch('/', {}, () => {}));
      assertCallbackError(err);
    });
  });

  describe('registerEndpoints w/ callback', () => {
    class EchoClient extends Gofer {
      constructor(config) {
        super(config, 'echo');
      }

      echo(qs, callback) {
        return this.fetch('/echo', { qs: qs }, callback);
      }
    }

    const client = new EchoClient({
      echo: { baseUrl: options.baseUrl },
    });

    it('throws a TypeError', () => {
      const err = assert.throws(() => client.echo({ a: 42 }, () => {}));
      assertCallbackError(err);
    });
  });

  describe('using new Gofer().fetch w/ callback', () => {
    it('throws a TypeError', () => {
      const gofer = new Gofer().with(options);
      const err = assert.throws(() => gofer.fetch('/echo', {}, () => {}));
      assertCallbackError(err);
    });
  });
});
