'use strict';
var assert = require('assertive');

var gofer = require('../');

describe('gofer', function () {
  it('is empty', function () {
    assert.deepEqual({}, gofer);
  });
});
