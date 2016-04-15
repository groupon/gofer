'use strict';
var execFile = require('child_process').execFile;

require('./mock-service');

describe('in a browser', function () {
  it('works (almost) just the same', function (done) {
    var mochifyBin = require.resolve('.bin/mochify');
    this.timeout(60 * 1000);
    var child = execFile(mochifyBin, [
      '--reporter', 'spec',
      './node_modules/promise/polyfill',
      './node_modules/whatwg-fetch',
      './test-browser/**/*.test.js',
    ], done);
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  });
});
