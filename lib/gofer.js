/*
 * Copyright (c) 2014, Groupon, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * Neither the name of GROUPON nor the names of its contributors may be
 * used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';
var isObjectLike = require('lodash/isObjectLike');
var isPlainObject = require('lodash/isPlainObject');
var merge = require('lodash/merge');
var mergeWith = require('lodash/mergeWith');

var fetch = require('./fetch');

function Gofer(config, serviceName, clientVersion, clientName) {
  config = config || {};
  serviceName = serviceName;
  clientVersion = clientVersion;
  clientName = clientName || serviceName;

  var globalDefaults = config.globalDefaults || {};
  var serviceDefaults = config[serviceName] || {};
  this.defaults = merge({
    serviceName: serviceName,
    clientVersion: clientVersion,
    clientName: clientName,
    endpointDefaults: {},
  }, globalDefaults, serviceDefaults);
}
module.exports = Gofer;
Gofer.fetch = fetch;
Gofer.default = Gofer;

Gofer.prototype.with =
function withOverrides(overrides) {
  var cloned = this.clone();
  merge(cloned.defaults, overrides);
  return cloned;
};

/**
 * If a subclass exposes a custom constructor, it can provide
 * a different implementation. For example it could pass down
 * additional dependencies.
 */
Gofer.prototype.clone =
function clone() {
  var Client = this.constructor || Gofer;
  var config = { globalDefaults: this.defaults };
  return new Client(config);
};

Gofer.prototype._mappers = [];
Gofer.prototype.addOptionMapper =
function addOptionMapper(mapper) {
  this._mappers = this._mappers.concat(mapper);
};

function applyOptionMapper(options, mapper) {
  // Allow mappers to either return the mapped options or to return nothing.
  // In the latter case we'll assume the options were modified in place.
  return mapper(options) || options;
}

function preventComplexMerge(objValue, srcValue) {
  if (!isObjectLike(objValue) && !isObjectLike(srcValue)) {
    return undefined;
  }

  if (!isPlainObject(objValue) || !isPlainObject(srcValue)) {
    return srcValue || objValue;
  }

  return mergeWith(objValue, srcValue, preventComplexMerge);
}

Gofer.prototype._prepareOptions =
function _prepareOptions(defaults, options) {
  var endpointName = options.endpointName || defaults.endpointName;
  var mergedOptions = mergeWith({}, this.defaults, defaults,
    this.defaults.endpointDefaults[endpointName],
    options, preventComplexMerge);
  return this._mappers.reduce(applyOptionMapper, mergedOptions);
};

function fetchWithDefaults(defaults) {
  return function withDefaults(uri, options, callback) {
    options = options || {};
    return fetch(uri, this._prepareOptions(defaults, options), callback);
  };
}

['get', 'put', 'post', 'patch', 'del', 'head']
.forEach(function withVerb(verb) {
  var httpMethod = verb === 'del' ? 'DELETE' : verb.toUpperCase();
  Gofer.prototype[verb] = fetchWithDefaults({ method: httpMethod });
});
Gofer.prototype.fetch = Gofer.prototype.get;

Gofer.prototype.registerEndpoint =
function registerEndpoint(name, endpointFn) {
  Object.defineProperty(this, name, {
    configurable: true,
    get: function _getCachedEndpoint() {
      var withDefaults = fetchWithDefaults({ endpointName: name }).bind(this);
      var value = endpointFn(withDefaults);
      Object.defineProperty(this, name, { value: value });
      return value;
    },
  });
  return this;
};

Gofer.prototype.registerEndpoints =
function registerEndpoints(endpointMap) {
  Object.keys(endpointMap).forEach(function register(name) {
    this.registerEndpoint(name, endpointMap[name]);
  }, this);
  return this;
};
