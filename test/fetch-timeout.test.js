'use strict';

const assert = require('assertive');

const fetch = require('../').fetch;

const options = require('./mock-service');
const remoteServer = require('./_remote-server');

function fetchWithLatency(latency, hang, timeout) {
  return fetch('/echo', {
    baseUrl: options.baseUrl,
    timeout,
    qs: { __latency: latency, __hang: hang },
  });
}

describe('fetch: timeouts', () => {
  it('succeeds if timeout is not exceeded', function() {
    this.timeout(500);
    return fetchWithLatency(100, 100, 300).then(res => {
      assert.equal(200, res.statusCode);
    });
  });

  it('response- & read-timeout are independent', function() {
    if (typeof document !== 'undefined') {
      // This isn't reliable in browser because we can't rely
      // that the response will be exposed in time.
      this.skip();
    }
    this.timeout(500);
    // total latency is 400 but each independently is <300
    return fetchWithLatency(200, 200, 300).then(res => {
      assert.equal(200, res.statusCode);
    });
  });

  it('will time out if response takes too long', function() {
    this.timeout(300);
    return assert.rejects(fetchWithLatency(200, 0, 100)).then(error => {
      // We set both the socket timeout & the response timeout to the same number.
      // Since the socket isn't active while waiting for the response headers,
      // both timers fire at the same time.
      assert.expect(
        error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT'
      );
    });
  });

  it('will time out if body takes too long', function() {
    if (typeof document !== 'undefined') {
      // This isn't reliable in browser because we can't rely
      // that the response will be exposed in time.
      this.skip();
    }
    this.timeout(150);
    return assert.rejects(fetchWithLatency(0, 300, 100).text()).then(error => {
      assert.equal('ESOCKETTIMEDOUT', error.code);
    });
  });

  it('connection timed out', function() {
    if (typeof document !== 'undefined') {
      // This isn't reliable in browser because there is no connection timeout.
      this.skip();
    }
    this.timeout(200);
    return assert
      .rejects(fetch('http://10.255.255.1', { connectTimeout: 100 }))
      .then(error => {
        assert.equal('ECONNECTTIMEDOUT', error.code);
      });
  });

  describe('timeout in the presence of blocking event loop', () => {
    if (typeof document !== 'undefined') {
      // There's no fork in the browser.
      return;
    }

    before(remoteServer.fork);
    after(remoteServer.kill);

    it('gives it a last chance', function(done) {
      this.timeout(500);

      fetch(
        `http://127.0.0.1:${remoteServer.port}`,
        {
          timeout: 100,
        },
        done
      );

      function blockEventLoop() {
        const endTime = Date.now() + 150;
        while (Date.now() < endTime) {
          /*noop*/
        }
      }

      setTimeout(blockEventLoop, 20);
    });
  });

  describe('completionTimeout', () => {
    if (typeof document !== 'undefined') {
      // We don't have enough visibility in a browser to support this.
      return;
    }

    it('does not pass an error when timeout is not exceeded', () => {
      return fetch('/', {
        baseUrl: options.baseUrl,
        qs: { __delay: 20 },
        completionTimeout: 50,
      }).text();
    });

    it('passes an error when timeout is exceeded', () => {
      return assert
        .rejects(
          fetch('/', {
            baseUrl: options.baseUrl,
            qs: { __delay: 50 },
            completionTimeout: 20,
          }).text()
        )
        .then(err => {
          assert.equal('ETIMEDOUT', err.code);
          assert.expect(err.completion);
        });
    });

    it('is triggered by a constant trickle of packages', function() {
      this.timeout(400);

      return assert
        .rejects(
          fetch('/', {
            baseUrl: options.baseUrl,
            qs: { __chunkDelay: 50, __totalDelay: 1000 },
            timeout: 100, // ensure we would not hit the "normal" timeout
            completionTimeout: 200,
          }).text()
        )
        .then(err => {
          assert.equal('ETIMEDOUT', err.code);
          assert.expect(err.completion);
        });
    });
  });
});
