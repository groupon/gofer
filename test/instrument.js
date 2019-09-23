'use strict';

const http = require('http');

const original = http.request;

function instrument() {
  http.request = function request(options) {
    // This is terrible instrumentation because it doesn't handle
    // all possible arguments. `options` isn't the only possible
    // call signature of `http.request`.
    Object.assign(instrument, options);
    return original.apply(this, arguments);
  };
}
module.exports = instrument;

instrument.reset = function reset() {
  http.request = original;
};
