'use strict';
var assert = require('assertive');

var fetch = require('../').fetch;

var options = require('./mock-service');

function fetchWithLatency(latency, hang, timeout) {
  return fetch('/echo', {
    baseUrl: options.baseUrl,
    timeout: timeout,
    qs: { __latency: latency, __hang: hang },
  });
}

describe('fetch: timeouts', function () {
  it('succeeds if timeout is not exceeded', function () {
    this.timeout(500);
    return fetchWithLatency(100, 100, 300)
      .then(function (res) {
        assert.equal(200, res.statusCode);
      });
  });

  it('response- & read-timeout are independent', function () {
    if (typeof document !== 'undefined') {
      // This isn't reliable in browser because we can't rely
      // that the response will be exposed in time.
      this.skip();
    }
    this.timeout(500);
    // total latency is 400 but each indendently is <300
    return fetchWithLatency(200, 200, 300)
      .then(function (res) {
        assert.equal(200, res.statusCode);
      });
  });

  it('will time out if response takes too long', function () {
    this.timeout(150);
    return assert.rejects(fetchWithLatency(200, 0, 100))
      .then(function (error) {
        assert.equal('ETIMEDOUT', error.code);
      });
  });

  it('will time out if body takes too long', function () {
    if (typeof document !== 'undefined') {
      // This isn't reliable in browser because we can't rely
      // that the response will be exposed in time.
      this.skip();
    }
    this.timeout(150);
    return assert.rejects(fetchWithLatency(0, 300, 100).text())
      .then(function (error) {
        assert.equal('ETIMEDOUT', error.code);
      });
  });

  it('connection timed out', function () {
    if (typeof document !== 'undefined') {
      // This isn't reliable in browser because there is no connection timeout.
      this.skip();
    }
    this.timeout(200);
    return assert.rejects(fetch('http://10.255.255.1', { connectTimeout: 100 }))
      .then(function (error) {
        assert.equal('ECONNECTTIMEDOUT', error.code);
      });
  });
});
