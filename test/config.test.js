/* eslint-disable no-underscore-dangle */

'use strict';

var assert = require('assertive');

var Gofer = require('../');

var CONFIG = {
  globalDefaults: { timeout: 100, connectTimeout: 55 },
  a: { timeout: 1001 },
  b: {
    timeout: 99,
    connectTimeout: 70,
    endpointDefaults: { x: { timeout: 23 } },
  },
};

function GoferA(config) {
  Gofer.call(this, config, 'a');
}
GoferA.prototype = Object.create(Gofer.prototype);

function GoferB(config) {
  Gofer.call(this, config, 'b');
}
GoferB.prototype = Object.create(Gofer.prototype);

describe('config handling', function() {
  var a;
  var b;

  before(function() {
    GoferB.prototype.registerEndpoints({
      x: function(fetch) {
        return function(cb) {
          return fetch('/something', cb);
        };
      },
    });

    a = new GoferA(CONFIG);
    b = new GoferB(CONFIG);
  });

  it('applies service-level config', function() {
    assert.equal(
      'applies service-level default',
      1001,
      a._prepareOptions({}, {}).timeout
    );
    assert.equal(
      'falls back to global default',
      55,
      a._prepareOptions({}, {}).connectTimeout
    );

    assert.equal(
      'does not apply endpoint default if endpointName is not provided',
      70,
      b._prepareOptions({}, {}).connectTimeout
    );
    assert.equal(
      'does not apply endpoint default for other endpoints',
      70,
      b._prepareOptions({ endpointName: 'y' }, {}).connectTimeout
    );

    assert.equal(
      'applies endpoint-level defaults',
      23,
      b._prepareOptions({ endpointName: 'x' }, {}).timeout
    );
    assert.equal(
      'falls back to service-level defaults',
      70,
      b._prepareOptions({ endpointName: 'x' }, {}).connectTimeout
    );
  });
});
