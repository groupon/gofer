'use strict';

const assert = require('assertive');

const Gofer = require('../');

const fetch = Gofer.fetch;

const options = require('./mock-service');

describe('legacy / callback mode', () => {
  if (typeof document === 'object') {
    it.skip('(callback interface not supported in browser builds)');
    return;
  }

  describe('using Gofer.fetch', () => {
    let returnValue;
    let error;
    let data;
    let response;

    before(done => {
      returnValue = fetch('/echo', options, (_error, _data, _response) => {
        error = _error;
        data = _data;
        response = _response;
        done(error);
      });
    });

    it('returns undefined', () => {
      assert.equal(undefined, returnValue);
    });

    it('returns the parsed body as data', () => {
      assert.truthy(data);
      assert.equal('GET', data.method);
    });

    it('includes the response object', () => {
      assert.truthy(response);
      assert.equal(200, response.statusCode);
    });

    it('includes the parsed body on 404s', done => {
      fetch('/json/404', options, (notFoundError, body) => {
        assert.truthy(notFoundError);
        assert.truthy(body);
        assert.equal('/json/404', body.url);
        assert.deepEqual(notFoundError.body, body);
        done();
      });
    });
  });

  describe('registerEndpoints', () => {
    function EchoClient(config) {
      Gofer.call(this, config, 'echo');
    }
    EchoClient.prototype = Object.create(Gofer.prototype, {
      constructor: { value: EchoClient },
    });

    EchoClient.prototype.registerEndpoints({
      echo(withDefaults) {
        return function (qs, callback) {
          return withDefaults('/echo', { qs }, callback);
        };
      },
    });

    const client = new EchoClient({
      echo: { baseUrl: options.baseUrl },
    });

    it('can be used as a promise', () => {
      return client.echo({ a: 42 }).then(response => {
        assert.equal(200, response.statusCode);
      });
    });

    it('turns into errback-style when callback is provided', done => {
      const result = client.echo({ a: 42 }, (error, data, response) => {
        if (error) return void done(error);
        assert.equal('Does *not* return a promise', undefined, result);
        assert.equal(200, response.statusCode);
        assert.equal('GET', data.method);
        done();
      });
    });
  });

  describe('using new Gofer().*', () => {
    let gofer;
    before('create Gofer instance', () => {
      gofer = new Gofer().with(options);
    });

    it('exposes the legacy mode interface', done => {
      gofer.get('/echo', {}, (error, body) => {
        assert.truthy(body);
        done(error);
      });
    });
  });
});
