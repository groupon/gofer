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

const fetch = require('./fetch');

const merge = require('lodash.merge');
const mergeWith = require('lodash.mergewith');
const isObjectLike = require('lodash.isobjectlike');
const isPlainObject = require('lodash.isplainobject');

function Gofer(config, serviceName, clientVersion, clientName) {
  config = config || {};
  serviceName = serviceName;
  clientVersion = clientVersion;
  clientName = clientName || serviceName;

  const globalDefaults = config.globalDefaults || {};
  const serviceDefaults = config[serviceName] || {};
  this.defaults = merge(
    {
      serviceName,
      clientVersion,
      clientName,
      endpointDefaults: {},
    },
    globalDefaults,
    serviceDefaults
  );
}
module.exports = Gofer;
Gofer.fetch = fetch;
Gofer.default = Gofer;

Gofer.prototype.with = function withOverrides(overrides) {
  const cloned = this.clone();
  merge(cloned.defaults, overrides);
  return cloned;
};

/**
 * If a subclass exposes a custom constructor, it can provide
 * a different implementation. For example it could pass down
 * additional dependencies.
 */
Gofer.prototype.clone = function clone() {
  const Client = this.constructor || Gofer;
  const config = { globalDefaults: this.defaults };
  return new Client(config);
};

// eslint-disable-next-line no-underscore-dangle
Gofer.prototype._mappers = [];
Gofer.prototype.addOptionMapper = function addOptionMapper(mapper) {
  this._mappers = this._mappers.concat(mapper);
};

function applyOptionMapper(options, mapper) {
  // Allow mappers to either return the mapped options or to return nothing.
  // In the latter case we'll assume the options were modified in place.
  return mapper(options) || options;
}

const DEFAULT_MERGER = undefined; // (see lodash/mergeWith docs)
function preventComplexMerge(objValue, srcValue) {
  if (!isObjectLike(objValue) && !isObjectLike(srcValue)) {
    return DEFAULT_MERGER;
  }

  if (!isPlainObject(objValue) || !isPlainObject(srcValue)) {
    return srcValue || objValue;
  }

  return mergeWith({}, objValue, srcValue, preventComplexMerge);
}

// eslint-disable-next-line no-underscore-dangle
Gofer.prototype._prepareOptions = function _prepareOptions(defaults, options) {
  return this.getMergedOptions(defaults, options);
};

Gofer.prototype.getMergedOptions = function getMergedOptions(
  defaults,
  options
) {
  defaults = defaults || {};
  options = options || {};
  const endpointName = options.endpointName || defaults.endpointName;
  const mergedOptions = mergeWith(
    {},
    this.defaults,
    defaults,
    this.defaults.endpointDefaults[endpointName],
    options,
    preventComplexMerge
  );
  delete mergedOptions.endpointDefaults;
  return this._mappers.reduce(applyOptionMapper, mergedOptions);
};

function fetchWithDefaults(defaults) {
  return function withDefaults(uri, options, callback) {
    options = options || {};
    return fetch(uri, this.getMergedOptions(defaults, options), callback);
  };
}

['get', 'put', 'post', 'patch', 'del', 'head', 'options', 'delete'].forEach(
  verb => {
    const httpMethod = verb === 'del' ? 'DELETE' : verb.toUpperCase();
    Gofer.prototype[verb] = fetchWithDefaults({ method: httpMethod });
  }
);
Gofer.prototype.fetch = Gofer.prototype.get;

Gofer.prototype.registerEndpoint = function registerEndpoint(name, endpointFn) {
  Object.defineProperty(this, name, {
    configurable: true,
    get: function _getCachedEndpoint() {
      const withDefaults = fetchWithDefaults({ endpointName: name }).bind(this);
      const value = endpointFn(withDefaults);
      Object.defineProperty(this, name, { value });
      return value;
    },
  });
  return this;
};

Gofer.prototype.registerEndpoints = function registerEndpoints(endpointMap) {
  Object.keys(endpointMap).forEach(function register(name) {
    this.registerEndpoint(name, endpointMap[name]);
  }, this);
  return this;
};
