'use strict';
var assert = require('assertive');
var Bluebird = require('bluebird');

var fetch = require('../').fetch;

var options = require('./mock-service');

describe('fetch: the basics', function () {
  it('can load using just a url string', function () {
    return fetch(options.baseUrl)
      .then(function (res) {
        assert.equal(200, res.statusCode);
      });
  });

  it('can load using path and baseUrl option', function () {
    return fetch('/text/path', { baseUrl: options.baseUrl })
      .then(function (res) {
        assert.equal(200, res.statusCode);
      });
  });

  it('has a convenience .json method', function () {
    return fetch('/echo', options)
      .json().then(function (echo) {
        assert.equal('GET', echo.method);
        assert.equal('/echo', echo.url);
      });
  });

  it('exposes the response body on status code error object', function () {
    return assert.rejects(fetch('/json/404', options).json())
      .then(function (error) {
        assert.truthy(error.body);
        // The response body constains a request mirror just like /echo
        assert.equal('GET', error.body.method);
      });
  });

  it('can add query string arguments', function () {
    return fetch('/echo?y=url&z=bar', {
      baseUrl: options.baseUrl,
      qs: { x: [1, 'foo'], y: 'qs' },
    }).json()
      .then(function (echo) {
        assert.equal('/echo?y=qs&z=bar&x[0]=1&x[1]=foo',
          decodeURIComponent(echo.url));
      });
  });

  it('can replace path params', function () {
    return fetch('/{foo}/other/{foo}/{bar}', {
      baseUrl: options.baseUrl + '/echo/{foo}',
      pathParams: { foo: 'abc', bar: 'xyz' },
    }).json()
      .then(function (echo) {
        assert.equal('/echo/abc/abc/other/abc/xyz', echo.url);
      });
  });

  it('throws when the url is not a string', function () {
    assert.equal(
      'url has to be a string',
      assert.throws(function () { fetch(); }).message);

    assert.equal(
      'url has to be a string',
      assert.throws(function () { fetch(true); }).message);

    assert.equal(
      'url has to be a string',
      assert.throws(function () { fetch(null); }).message);
  });

  it('throws when the baseUrl contains a query string', function () {
    var error = assert.throws(function () {
      fetch('/text/path', { baseUrl: options.baseUrl + '?x=1' });
    });
    assert.equal('baseUrl may not contain a query string', error.message);
  });

  it('exposes a promise to a response body stream', function () {
    function concat(stream) {
      return new Bluebird(function (resolve, reject) {
        stream.on('error', reject);
        var chunks = [];
        stream.on('data', function (chunk) { chunks.push(chunk); });
        stream.on('end', function () { resolve(Buffer.concat(chunks)); });
      });
    }

    return fetch('/test/path', options)
      .then(function (res) { return res.stream(); })
      .then(concat)
      .then(function (body) {
        assert.equal('ok', '' + body);
      });
  });
});
