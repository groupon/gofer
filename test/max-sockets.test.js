'use strict';

var assert = require('assertive');
var Bluebird = require('bluebird');

var Gofer = require('../');

var options = require('./mock-service');

function urlWithDate(echo) {
  return { url: echo.url, time: Date.now() };
}

function getUrlPath(item) {
  return item.url.replace(/^\/echo\/([^?]+)(?:\?.*)?/, '$1');
}

describe('fetch: maxSockets', function() {
  it('loads two one after the other', function() {
    if (typeof document !== 'undefined') {
      // Browsers don't allow us to control the parallism
      return this.skip();
    }
    this.timeout(2000);
    var foo = new Gofer(
      {
        foo: {
          baseUrl: options.baseUrl,
          maxSockets: 2,
          qs: { __latency: 100 },
        },
      },
      'foo'
    );
    var bar = new Gofer(
      {
        bar: {
          baseUrl: options.baseUrl,
          maxSockets: 2,
          qs: { __latency: 100 },
        },
      },
      'bar'
    );
    return Bluebird.all([
      foo
        .fetch('/echo/1')
        .json()
        .then(urlWithDate),
      foo
        .fetch('/echo/2')
        .json()
        .then(urlWithDate),
      foo
        .fetch('/echo/3')
        .json()
        .then(urlWithDate),
      foo
        .fetch('/echo/4')
        .json()
        .then(urlWithDate),
      foo
        .fetch('/echo/5', { baseUrl: 'http://127.0.0.1:3066' })
        .json()
        .then(urlWithDate),
      bar
        .fetch('/echo/bar')
        .json()
        .then(urlWithDate),
    ]).then(function(results) {
      assert.hasType(Array, results);
      assert.deepEqual(
        ['1', '2', '3', '4', '5', 'bar'],
        results.map(getUrlPath)
      );

      var times = results.map(function(result) {
        return result.time;
      });

      assert.expect(
        'The first two should happen around the same time',
        Math.abs(times[0] - times[1]) < 50
      );

      // 2. The next two are the same, just 100+ ms later
      assert.expect(
        'The next two are the same...',
        Math.abs(times[2] - times[3]) < 50
      );
      assert.expect(
        // leaving some space for timing issues
        '...just 100+ ms later (' + times[2] + ' - ' + times[0] + ' >= 90)',
        times[2] - times[0] > 90
      );

      assert.expect(
        '#5 uses a different hostname, so it should happen with the first 2',
        Math.abs(times[4] - times[1]) < 50
      );

      assert.expect(
        '`bar` has a different serviceName, so it should get its own agents',
        Math.abs(times[5] - times[1]) < 50
      );
    });
  });
});
