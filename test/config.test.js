'use strict';

const assert = require('assert');

const Gofer = require('../');

const CONFIG = {
  globalDefaults: { timeout: 100, connectTimeout: 55 },
  a: { timeout: 1001 },
  b: {
    timeout: 99,
    connectTimeout: 70,
    qs: { key: 'val' },
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

  x() {
    return this.get('/something');
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
    assert.strictEqual(
      a.getMergedOptions({}, {}).timeout,
      1001,
      'applies service-level default'
    );

    assert.strictEqual(
      a.getMergedOptions({}, {}).connectTimeout,
      55,
      'falls back to global default'
    );

    assert.strictEqual(
      b.getMergedOptions({}, {}).connectTimeout,
      70,
      'does not apply endpoint default if endpointName is not provided'
    );

    assert.strictEqual(
      b.getMergedOptions({ endpointName: 'y' }, {}).connectTimeout,
      70,
      'does not apply endpoint default for other endpoints'
    );

    assert.strictEqual(
      b.getMergedOptions({ endpointName: 'x' }, {}).timeout,
      23,
      'applies endpoint-level defaults'
    );

    assert.strictEqual(
      b.getMergedOptions({ endpointName: 'x' }, {}).connectTimeout,
      70,
      'falls back to service-level defaults'
    );
  });
});
