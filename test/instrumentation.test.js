'use strict';

const assert = require('assertive');
const assign = require('lodash/assign');

const { Gofer } = require('../');

const instrument = require('./instrument');

const options = require('./mock-service');

function ensureEmpty() {
  assign(instrument, {
    serviceName: null,
    endpointName: null,
    methodName: null,
    pathParams: null,
  });
  assert.equal(null, instrument.serviceName);
  assert.equal(null, instrument.endpointName);
  assert.equal(null, instrument.methodName);
  assert.equal(null, instrument.pathParams);
}

describe('Verify instrumentation support', () => {
  class Instrumented extends Gofer {
    constructor() {
      super({ globalDefaults: options }, 'instrumented');
    }

    echo() {
      return this.fetch('/{x}', {
        method: 'PUT',
        pathParams: { x: 'echo' },
        endpointName: 'echo',
      });
    }

    named() {
      return this.fetch('/echo', {
        method: 'PUT',
        methodName: 'echo',
        endpointName: 'named',
      });
    }
  }
  const client = new Instrumented();

  before('add instrumentation', instrument);
  after('remove instrumentation', instrument.reset);

  describe('direct request', () => {
    before(ensureEmpty);

    before('make a request', () => {
      return client.fetch('/echo');
    });

    it('sets the meta data', () => {
      assert.equal('instrumented', instrument.serviceName);
      assert.equal(undefined, instrument.endpointName);
      assert.equal('get', instrument.methodName);
      assert.equal(undefined, instrument.pathParams);
    });
  });

  describe('call endpoint', () => {
    before(ensureEmpty);

    before('make a request', () => {
      return client.echo();
    });

    it('sets the meta data', () => {
      assert.equal('instrumented', instrument.serviceName);
      assert.equal('echo', instrument.endpointName);
      assert.equal('put', instrument.methodName);
      assert.deepEqual({ x: 'echo' }, instrument.pathParams);
    });
  });

  describe('with explicit methodName', () => {
    before(ensureEmpty);

    before('make a request', () => {
      return client.named();
    });

    it('sets the meta data', () => {
      assert.equal('instrumented', instrument.serviceName);
      assert.equal('named', instrument.endpointName);
      assert.equal('echo', instrument.methodName);
      assert.equal(undefined, instrument.pathParams);
    });
  });
});
