'use strict';

const http = require('http');

const assert = require('assertive');

const fetch = require('../').fetch;

describe('fetch: searchDomain', () => {
  if (typeof document !== 'undefined') {
    // This is not really a feature relevant for client-side code.
    it('is not implemented');
    return;
  }

  it('appends the searchDomain to non-fqdns in uri', () => {
    const options = { searchDomain: 'bar123' };
    return assert
      .rejects(fetch('http://some.invalid.thing/a/path', options))
      .then(error => {
        assert.equal('ENOTFOUND', error.code);
        if ('hostname' in error) {
          // node 4.x+
          assert.equal('some.invalid.thing.bar123.', error.hostname);
        }
      });
  });

  it('appends the searchDomain to non-fqdns in baseUrl', () => {
    const options = {
      baseUrl: 'http://some.invalid.thing/a',
      searchDomain: 'bar123',
    };
    return assert.rejects(fetch('/path', options)).then(error => {
      assert.equal('ENOTFOUND', error.code);
      if ('hostname' in error) {
        // node 4.x+
        assert.equal('some.invalid.thing.bar123.', error.hostname);
      }
    });
  });

  it('never appends the searchDomain to fqdns in uri', () => {
    const options = { searchDomain: 'bar123' };
    return assert
      .rejects(fetch('http://some.invalid.thing./a/path', options))
      .then(error => {
        assert.equal('ENOTFOUND', error.code);
        if ('hostname' in error) {
          // node 4.x+
          assert.equal('some.invalid.thing.', error.hostname);
        }
      });
  });

  it('never appends the searchDomain to fqdns in baseUrl', () => {
    const options = {
      baseUrl: 'http://some.invalid.thing./a',
      searchDomain: 'bar123',
    };
    return assert.rejects(fetch('/path', options)).then(error => {
      assert.equal('ENOTFOUND', error.code);
      if ('hostname' in error) {
        // node 4.x+
        assert.equal('some.invalid.thing.', error.hostname);
      }
    });
  });

  describe('localhost and IP', () => {
    const server = http.createServer((req, res) => {
      res.end('{"ok":true}');
    });

    before(done => {
      server.listen(done);
    });

    after(() => {
      server.close();
    });

    it('never appends the searchDomain to localhost', () => {
      const options = {
        baseUrl: `http://localhost:${server.address().port}`,
        searchDomain: 'bar123',
      };
      return fetch('/path', options)
        .json()
        .then(result => {
          assert.deepEqual({ ok: true }, result);
        });
    });

    it('never appends the searchDomain to an IP address', () => {
      const options = {
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        searchDomain: 'bar123',
      };
      return fetch('/path', options)
        .json()
        .then(result => {
          assert.deepEqual({ ok: true }, result);
        });
    });
  });
});
