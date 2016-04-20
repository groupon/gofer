'use strict';
var assert = require('assertive');
var Bluebird = require('bluebird');

// This is important because PhantomJS has a non-writeable
// error.stack property and the resulting warnings make the tests fail...
Bluebird.config({ warnings: false });

var fetch = require('../').fetch;

var options = require('./mock-service');

describe('fetch: the basics', function () {
  it('can load using just a url string', function () {
    return fetch(options.baseUrl)
      .then(function (res) {
        assert.equal(200, res.statusCode);
      });
  });

  it('exposes the url on the response', function () {
    return fetch(options.baseUrl + '/echo/foo/bar', { qs: { x: 42 } })
      .then(function (res) {
        assert.equal(options.baseUrl + '/echo/foo/bar?x=42', res.url);
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

  it('exposes the full URL and HTTP method on status code error object', function () {
    return assert.rejects(fetch('/json/404', {
      baseUrl: options.baseUrl,
      method: 'PUT',
      qs: { x: 42 },
    }).json())
      .then(function (error) {
        assert.equal(options.baseUrl + '/json/404?x=42', error.url);
        assert.equal('PUT', error.method);
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

  it('fails when a {pathParam} is not provided', function () {
    var error = assert.throws(function () {
      fetch('/{foo}', options);
    });
    assert.equal('Missing value for path param foo', error.message);
  });

  it('fails when a {pathParam} in the baseUrl is not provided', function () {
    // The baseUrl will be parsed which turns '{' into '%7B' etc.
    var error = assert.throws(function () {
      fetch('/', { baseUrl: options.baseUrl + '/{foo}' });
    });
    assert.equal('Missing value for path param foo', error.message);
  });

  it('does not fail when a pathParam is not used', function () {
    return fetch('/echo', {
      baseUrl: options.baseUrl,
      pathParams: { foo: 'abc', bar: 'xyz' },
    }).json()
      .then(function (echo) {
        assert.equal('/echo', echo.url);
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
    if (typeof document !== 'undefined') {
      // Streams in the browser and streams in node are two different things.
      return this.skip();
    }
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

  it('allows controlling the http method', function () {
    return fetch('/echo', { baseUrl: options.baseUrl, method: 'POST' })
      .json()
      .then(function (echo) {
        assert.equal('POST', echo.method);
      });
  });

  describe('host header', function () {
    it('sends a valid host header', function () {
      return fetch(options.baseUrl + '/echo').json()
        .then(function (echo) {
          assert.equal('localhost:3066', echo.headers.host);
        });
    });

    it('sends a valid host header with baseUrl', function () {
      return fetch('/echo', { baseUrl: options.baseUrl }).json()
        .then(function (echo) {
          assert.equal('localhost:3066', echo.headers.host);
        });
    });
  });

  it('allows passing headers', function () {
    return fetch('/echo', {
      baseUrl: options.baseUrl,
      method: 'POST',
      headers: { 'Content-Type': 'text/x-pizza' },
      body: '🍕🍕🍕',
    }).json()
      .then(function (echo) {
        assert.equal('text/x-pizza', echo.headers['content-type']);
      });
  });

  it('allows passing in nested query string params', function () {
    var withQuery = {
      baseUrl: options.baseUrl,
      qs: {
        nested: { key: 'value' },
        arr: [{ x: 3 }, { x: 4 }],
      },
    };
    return fetch('/echo', withQuery)
      .json()
      .then(function (echo) {
        assert.equal(
          encodeURI('/echo?nested[key]=value&arr[0][x]=3&arr[1][x]=4'),
          echo.url);
      });
  });

  it('sets basic auth header from string', function () {
    return fetch('/echo', { baseUrl: options.baseUrl, auth: 'user:p4ssword' })
      .json()
      .then(function (echo) {
        assert.equal('Basic dXNlcjpwNHNzd29yZA==', echo.headers.authorization);
      });
  });

  it('sets basic auth header from object', function () {
    var authObject = {
      username: 'user',
      password: 'p4ssword',
    };
    return fetch('/echo', { baseUrl: options.baseUrl, auth: authObject })
      .json()
      .then(function (echo) {
        assert.equal('Basic dXNlcjpwNHNzd29yZA==', echo.headers.authorization);
      });
  });

  it('returns response headers', function () {
    // this is a silly test in node but is relevant to browser usage
    return fetch('/test/path', options)
      .then(function (res) {
        // Testing content-language b/c it's a "simple response header"
        assert.equal('has%20stuff', res.headers['content-language']);
      });
  });
});
