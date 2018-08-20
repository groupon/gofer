'use strict';

/**
 * This re-runs the whole test suite inside of phantomjs.
 * That's great for CI but tends to be hard to debug.
 *
 * So for debugging purposes there's:
 *
 * 1. Start the test API: `node test/mock-service.js`
 * 2. Create the test HTML page (see below)
 * 3. Open `tmp/test.html` in your browser
 *
 * ```
 * mochify --watch --consolify tmp/test.html --reporter spec ./node_modules/promise/polyfill ./node_modules/whatwg-fetch ./test/**\/*.test.js
 * ```
 */

// Early out if we're not running in node right now
if (typeof document !== 'undefined') return;

// Ignore this import when processing via browserify
const spawn = /** @type {import('child_process').spawn} */ (module.require(
  '' + 'child_process'
).spawn);

require('./mock-service');

describe('in a browser', () => {
  it('works (almost) just the same', function() {
    const mochifyBin = require.resolve('.bin/mochify');
    this.timeout(60 * 1000);
    const child = spawn(
      mochifyBin,
      [
        '--allow-chrome-as-root',
        '--reporter',
        'spec',
        './node_modules/promise/polyfill',
        './node_modules/whatwg-fetch',
        './test/**/*.test.js',
      ],
      {
        stdio: 'inherit',
      }
    );
    return new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', code => {
        if (code === 0) resolve();
        reject(new Error(`Browser tests failed with code ${code}`));
      });
    });
  });
});
