'use strict';

var http = require('http');

var assert = require('assertive');

var fetch = require('../').fetch;

describe('fetch: searchDomain', function() {
  if (typeof document !== 'undefined') {
    // This is not really a feature relevant for client-side code.
    it('is not implemented');
    return;
  }

  it('appends the searchDomain to non-fqdns in uri', function() {
    var options = { searchDomain: 'bar123' };
    return assert
      .rejects(fetch('http://some.invalid.thing/a/path', options))
      .then(function(error) {
        assert.equal('ENOTFOUND', error.code);
        if ('hostname' in error) {
          // node 4.x+
          assert.equal('some.invalid.thing.bar123.', error.hostname);
        }
      });
  });

  it('appends the searchDomain to non-fqdns in baseUrl', function() {
    var options = {
      baseUrl: 'http://some.invalid.thing/a',
      searchDomain: 'bar123',
    };
    return assert.rejects(fetch('/path', options)).then(function(error) {
      assert.equal('ENOTFOUND', error.code);
      if ('hostname' in error) {
        // node 4.x+
        assert.equal('some.invalid.thing.bar123.', error.hostname);
      }
    });
  });

  it('never appends the searchDomain to fqdns in uri', function() {
    var options = { searchDomain: 'bar123' };
    return assert
      .rejects(fetch('http://some.invalid.thing./a/path', options))
      .then(function(error) {
        assert.equal('ENOTFOUND', error.code);
        if ('hostname' in error) {
          // node 4.x+
          assert.equal('some.invalid.thing.', error.hostname);
        }
      });
  });

  it('never appends the searchDomain to fqdns in baseUrl', function() {
    var options = {
      baseUrl: 'http://some.invalid.thing./a',
      searchDomain: 'bar123',
    };
    return assert.rejects(fetch('/path', options)).then(function(error) {
      assert.equal('ENOTFOUND', error.code);
      if ('hostname' in error) {
        // node 4.x+
        assert.equal('some.invalid.thing.', error.hostname);
      }
    });
  });

  describe('localhost and IP', function() {
    var server = http.createServer(function(req, res) {
      res.end('{"ok":true}');
    });

    before(function(done) {
      server.listen(done);
    });

    it('never appends the searchDomain to localhost', function() {
      var options = {
        baseUrl: 'http://localhost:' + server.address().port,
        searchDomain: 'bar123',
      };
      return fetch('/path', options)
        .json()
        .then(function(result) {
          assert.deepEqual({ ok: true }, result);
        });
    });

    it('never appends the searchDomain to an IP address', function() {
      var options = {
        baseUrl: 'http://127.0.0.1:' + server.address().port,
        searchDomain: 'bar123',
      };
      return fetch('/path', options)
        .json()
        .then(function(result) {
          assert.deepEqual({ ok: true }, result);
        });
    });
  });
});
