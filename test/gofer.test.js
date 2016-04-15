'use strict';
var assert = require('assertive');

var Gofer = require('../');

var options = require('./mock-service');

describe('gofer', function () {
  it('exports a `fetch` function', function () {
    assert.hasType(Function, Gofer.fetch);
  });

  it('exposes Gofer as exports.default', function () {
    assert.equal(Gofer, Gofer.default);
  });

  describe('direct usage', function () {
    var gofer;
    before('create Gofer instance', function () {
      gofer = new Gofer().with(options);
    });

    it('can fetch something', function () {
      return gofer.get('/echo');
    });

    if (typeof document === 'object') {
      it.skip('(callback interface not supported in browser builds)');
      return;
    }
    it('exposes the legacy mode interface', function (done) {
      gofer.get('/echo', {}, function (error, body) {
        assert.truthy(body);
        done(error);
      });
    });
  });

  describe('sub-class', function () {
    function SubGofer(config) {
      Gofer.call(this, config, 'sub', '1.2.3', 'my-sub-client');
    }
    SubGofer.prototype = Object.create(Gofer.prototype);

    var sub;
    before('create SubGofer instance', function () {
      sub = new SubGofer({ sub: options });
    });

    it('can fetch something', function () {
      return sub.get('/echo').json()
        .then(function (echo) {
          var expectedUserAgent = typeof navigator !== 'undefined' ?
            navigator.userAgent : 'my-sub-client/1.2.3';
          assert.include(expectedUserAgent, echo.headers['user-agent']);
        });
    });
  });
});
