'use strict';
var assert = require('assertive');

var Gofer = require('../');
var fetch = Gofer.fetch;

var options = require('./mock-service');

describe('legacy / callback mode', function () {
  if (typeof document === 'object') {
    it.skip('(callback interface not supported in browser builds)');
    return;
  }

  describe('using Gofer.fetch', function () {
    var returnValue;
    var error;
    var data;
    var response;

    before(function (done) {
      returnValue = fetch('/echo', options, function (_error, _data, _response) {
        error = _error;
        data = _data;
        response = _response;
        done(error);
      });
    });

    it('returns undefined', function () {
      assert.equal(undefined, returnValue);
    });

    it('returns the parsed body as data', function () {
      assert.truthy(data);
      assert.equal('GET', data.method);
    });

    it('includes the response object', function () {
      assert.truthy(response);
      assert.equal(200, response.statusCode);
    });

    it('includes the parsed body on 404s', function (done) {
      fetch('/json/404', options, function (notFoundError, body) {
        assert.truthy(notFoundError);
        assert.truthy(body);
        assert.equal('/json/404', body.url);
        assert.deepEqual(notFoundError.body, body);
        done();
      });
    });
  });

  describe('using new Gofer().*', function () {
    var gofer;
    before('create Gofer instance', function () {
      gofer = new Gofer().with(options);
    });

    it('exposes the legacy mode interface', function (done) {
      gofer.get('/echo', {}, function (error, body) {
        assert.truthy(body);
        done(error);
      });
    });
  });
});
