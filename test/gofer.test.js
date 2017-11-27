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
  });

  describe('call that sets a header', function () {
    var gofer;
    before(function () {
      gofer = new Gofer().with({
        headers: { 'x-a': 'foo' },
      }).with(options);

      return gofer.fetch('/echo', {
        headers: { 'x-b': 'should not leak' },
      }).json();
    });

    it('does not affect defaults', function () {
      return gofer.fetch('/echo').json()
        .then(function (echo) {
          assert.equal('foo', echo.headers['x-a']);
          assert.equal(undefined, echo.headers['x-b']);
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
