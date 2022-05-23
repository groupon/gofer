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
    return this.get('/something', { qs: { key2: 'val2' } });
  }

  y() {
    return this.get('/else', { qs: new URLSearchParams([['key3', 'val3']]) });
  }
}

describe('config handling', () => {
  let a;
  let b;
  before(() => {
    a = new GoferA(CONFIG);
    b = new GoferB(CONFIG);
  });

  it('applies service-level default', () => {
    assert.strictEqual(a.getMergedOptions({}, {}).timeout, 1001);
  });

  it('falls back to global default', () => {
    assert.strictEqual(a.getMergedOptions({}, {}).connectTimeout, 55);
  });

  it('does not apply endpoint default if endpointName is not provided', () => {
    assert.strictEqual(b.getMergedOptions({}, {}).connectTimeout, 70);
  });

  it('does not apply endpoint default for other endpoints', () => {
    assert.strictEqual(
      b.getMergedOptions({ endpointName: 'y' }, {}).connectTimeout,
      70
    );
  });

  it('applies endpoint-level defaults', () => {
    assert.strictEqual(
      b.getMergedOptions({ endpointName: 'x' }, {}).timeout,
      23
    );
  });

  it('falls back to service-level defaults', () => {
    assert.strictEqual(
      b.getMergedOptions({ endpointName: 'x' }, {}).connectTimeout,
      70
    );
  });

  it('merges fetch-argument qs obj with nothing', () => {
    assert.deepStrictEqual(
      a.getMergedOptions({ endpointName: 'z' }, { qs: { key1: 'val1' } }).qs,
      { key1: 'val1' }
    );
  });

  it('merges fetch-argument qs URLSearchParams with nothing', () => {
    assert.deepStrictEqual(
      a.getMergedOptions(
        { endpointName: 'z' },
        { qs: new URLSearchParams([['key1', 'val1']]) }
      ).qs,
      new URLSearchParams([['key1', 'val1']])
    );
  });

  it('merges fetch-argument qs obj with config obj', () => {
    assert.deepStrictEqual(
      b.getMergedOptions({ endpointName: 'x' }, { qs: { key2: 'val2' } }).qs,
      { key: 'val', key2: 'val2' }
    );
  });

  it('merges fetch-argument qs URLSearchParams with config obj', () => {
    assert.deepStrictEqual(
      b.getMergedOptions(
        { endpointName: 'x' },
        { qs: new URLSearchParams([['key3', 'val3']]) }
      ).qs,
      new URLSearchParams([
        ['key', 'val'],
        ['key3', 'val3'],
      ])
    );
  });

  it('merges fetch-argument & config URLSearchParams', () => {
    assert.deepStrictEqual(
      a.getMergedOptions(
        {
          endpointName: 'x',
          qs: new URLSearchParams([
            ['key2', 'val2'],
            ['key4', 'val4a'],
            ['key4', 'val4b'],
          ]),
        },
        {
          qs: new URLSearchParams([
            ['key3', 'val3'],
            ['key4', 'val4'],
          ]),
        }
      ).qs,
      new URLSearchParams([
        ['key2', 'val2'],
        ['key4', 'val4'],
        ['key3', 'val3'],
      ])
    );
  });

  it('merges fetch-argument qs obj with config URLSearchParams', () => {
    assert.deepStrictEqual(
      a.getMergedOptions(
        {
          endpointName: 'x',
          qs: new URLSearchParams([
            ['key2', 'val2'],
            ['key4', 'val4a'],
            ['key4', 'val4b'],
          ]),
        },
        {
          qs: { key2: 'val2b' },
        }
      ).qs,
      new URLSearchParams([
        ['key2', 'val2b'],
        ['key4', 'val4a'],
        ['key4', 'val4b'],
      ])
    );
  });
});
