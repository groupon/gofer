'use strict';
var assert = require('assertive');

var Gofer = require('../');

var defaultOptions = require('./mock-service');

describe('fetch: sending a body', function () {
  var client = new Gofer().with(defaultOptions);
  client.registerEndpoint('echo', function (fetch) {
    return function (options) {
      return fetch('/echo', options).json();
    };
  });

  it('can send a string', function () {
    return client.echo({ body: 'I💖🍕', method: 'PUT' })
      .then(function (echo) {
        assert.equal('PUT', echo.method);
        assert.equal('9', echo.headers['content-length']);
        assert.equal('I💖🍕', echo.body);
      });
  });

  it('can send a Buffer', function () {
    if (typeof document !== 'undefined') {
      return this.skip();
    }
    return client.echo({ body: new Buffer('I💖🍕'), method: 'PUT' })
      .then(function (echo) {
        assert.equal('PUT', echo.method);
        assert.equal('9', echo.headers['content-length']);
        assert.equal('I💖🍕', echo.body);
      });
  });

  it('can send a node ReadableStream');
});
