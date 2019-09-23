'use strict';

const assert = require('assertive');

const Gofer = require('../');

const instrument = require('./instrument');

const options = require('./mock-service');

function ensureEmpty() {
  Object.assign(instrument, {
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
  const client = new Gofer({ instrumented: options }, 'instrumented');

  client.registerEndpoints({
    echo(fetch) {
      return function() {
        return fetch('/{x}', { method: 'PUT', pathParams: { x: 'echo' } });
      };
    },
    named(fetch) {
      return function() {
        return fetch('/echo', { method: 'PUT', methodName: 'echo' });
      };
    },
  });

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
