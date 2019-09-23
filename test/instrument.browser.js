/* eslint-env browser */

'use strict';

const original = typeof window !== 'undefined' ? window.fetch : null;

function instrument() {
  window.fetch = function fetch(url, options) {
    // This is terrible instrumentation because it doesn't handle
    // all possible arguments. E.g. `url` could also be an instance
    // of Request.
    Object.assign(instrument, options || {});
    return original.apply(this, arguments);
  };
}
module.exports = instrument;

instrument.reset = function reset() {
  window.fetch = original;
};
