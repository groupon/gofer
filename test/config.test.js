/* eslint-disable no-underscore-dangle */

'use strict';

const assert = require('assertive');

const { Gofer } = require('../');

const CONFIG = {
  globalDefaults: { timeout: 100, connectTimeout: 55 },
  a: { timeout: 1001 },
  b: {
    timeout: 99,
    connectTimeout: 70,
    endpointDefaults: { x: { timeout: 23 } },
  },
};

class GoferA extends Gofer {
  constructor(config) {
    super(config, 'a');
  }
}

class GoferB extends Gofer {
  constructor(config) {
    super(config, 'b');
  }
}

describe('config handling', () => {
  let a;
  let b;

  before(() => {
    a = new GoferA(CONFIG);
    b = new GoferB(CONFIG);
  });

  it('applies service-level config', () => {
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
