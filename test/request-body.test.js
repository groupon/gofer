/* eslint-disable no-underscore-dangle */

'use strict';

var assert = require('assertive');

var Gofer = require('../');

var defaultOptions = require('./mock-service');

describe('fetch: sending a body', function() {
  var client = new Gofer().with(defaultOptions);
  client.registerEndpoint('echo', function(fetch) {
    return function(options) {
      return fetch('/echo', options).json();
    };
  });

  it('can send a string', function() {
    return client.echo({ body: 'I💖🍕', method: 'PUT' }).then(function(echo) {
      assert.equal('PUT', echo.method);
      assert.equal('9', echo.headers['content-length']);
      assert.equal('I💖🍕', echo.body);
    });
  });

  it('can send a Buffer', function() {
    if (typeof document !== 'undefined') {
      return this.skip();
    }
    return client
      .echo({ body: new Buffer('I💖🍕'), method: 'PUT' })
      .then(function(echo) {
        assert.equal('PUT', echo.method);
        assert.equal('9', echo.headers['content-length']);
        assert.equal('I💖🍕', echo.body);
      });
  });

  it('can send a node ReadableStream', function() {
    if (typeof document !== 'undefined') {
      return this.skip();
    }
    var Readable = require('stream').Readable;

    var stream = new Readable();
    var characters = ['I', '💖', '🍕'];
    stream._read = function _read() {
      setTimeout(function doPush() {
        stream.push(characters.shift() || null);
      }, 5);
    };

    var withStreamBody = {
      baseUrl: defaultOptions.baseUrl,
      method: 'PUT',
      body: stream,
    };
    return client.echo(withStreamBody).then(function(echo) {
      assert.equal('PUT', echo.method);
      // it should chunk the response
      assert.equal(undefined, echo.headers['content-length']);
      assert.equal('I💖🍕', echo.body);
    });
  });

  it('can send a JSON body', function() {
    var withJsonBody = {
      baseUrl: defaultOptions.baseUrl,
      method: 'PUT',
      json: {
        utf8: 'I💖🍕',
        arr: [3, 4],
      },
    };
    return client.echo(withJsonBody).then(function(echo) {
      assert.equal(
        'application/json;charset=UTF-8',
        echo.headers['content-type']
      );
      assert.equal('{"utf8":"I💖🍕","arr":[3,4]}', echo.body);
    });
  });

  it('can send a form body', function() {
    var withFormBody = {
      baseUrl: defaultOptions.baseUrl,
      method: 'PUT',
      form: {
        nested: { utf8: 'I💖🍕' },
        arr: [3, 4],
      },
    };
    return client.echo(withFormBody).then(function(echo) {
      assert.equal(
        'application/x-www-form-urlencoded;charset=UTF-8',
        echo.headers['content-type']
      );
      assert.equal(
        encodeURIComponent('nested[utf8]') +
          '=' +
          encodeURIComponent('I💖🍕') +
          '&' +
          encodeURIComponent('arr[0]') +
          '=3&' +
          encodeURIComponent('arr[1]') +
          '=4',
        echo.body
      );
    });
  });
});
