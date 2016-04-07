'use strict';
var util = require('util');

var assert = require('assertive');

var Gofer = require('../');

var withMockService = require('./mock-service');

describe('gofer', function () {
  var options = withMockService();

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
    util.inherits(SubGofer, Gofer);

    var sub;
    before('create SubGofer instance', function () {
      sub = new SubGofer({ sub: options });
    });

    it('can fetch something', function () {
      return sub.get('/echo').json()
        .then(function (echo) {
          assert.include('my-sub-client/1.2.3', echo.headers['user-agent']);
        });
    });
  });
});
