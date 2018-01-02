'use strict';

var assert = require('assertive');
var assign = require('lodash/assign');

var Gofer = require('../');

var instrument = require('./instrument');

var options = require('./mock-service');

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

describe('Verify instrumentation support', function() {
  var client = new Gofer({ instrumented: options }, 'instrumented');

  client.registerEndpoints({
    echo: function(fetch) {
      return function() {
        return fetch('/{x}', { method: 'PUT', pathParams: { x: 'echo' } });
      };
    },
    named: function(fetch) {
      return function() {
        return fetch('/echo', { method: 'PUT', methodName: 'echo' });
      };
    },
  });

  before('add instrumentation', instrument);
  after('remove instrumentation', instrument.reset);

  describe('direct request', function() {
    before(ensureEmpty);

    before('make a request', function() {
      return client.fetch('/echo');
    });

    it('sets the meta data', function() {
      assert.equal('instrumented', instrument.serviceName);
      assert.equal(undefined, instrument.endpointName);
      assert.equal('get', instrument.methodName);
      assert.equal(undefined, instrument.pathParams);
    });
  });

  describe('call endpoint', function() {
    before(ensureEmpty);

    before('make a request', function() {
      return client.echo();
    });

    it('sets the meta data', function() {
      assert.equal('instrumented', instrument.serviceName);
      assert.equal('echo', instrument.endpointName);
      assert.equal('put', instrument.methodName);
      assert.deepEqual({ x: 'echo' }, instrument.pathParams);
    });
  });

  describe('with explicit methodName', function() {
    before(ensureEmpty);

    before('make a request', function() {
      return client.named();
    });

    it('sets the meta data', function() {
      assert.equal('instrumented', instrument.serviceName);
      assert.equal('named', instrument.endpointName);
      assert.equal('echo', instrument.methodName);
      assert.equal(undefined, instrument.pathParams);
    });
  });
});
