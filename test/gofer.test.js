'use strict';
var assert = require('assertive');

var Gofer = require('../');

describe('gofer', function () {
  it('exports a `fetch` function', function () {
    assert.hasType(Function, Gofer.fetch);
  });
});
