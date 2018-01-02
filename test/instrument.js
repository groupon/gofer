'use strict';

var http = require('http');

var assign = require('lodash/assign');

var original = http.request;

function instrument() {
  http.request = function request(options) {
    // This is terrible instrumentation because it doesn't handle
    // all possible arguments. `options` isn't the only possible
    // call signature of `http.request`.
    assign(instrument, options);
    return original.apply(this, arguments);
  };
}
module.exports = instrument;

instrument.reset = function reset() {
  http.request = original;
};
