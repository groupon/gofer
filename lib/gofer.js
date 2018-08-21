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

const isObjectLike = require('lodash/isObjectLike');
const isPlainObject = require('lodash/isPlainObject');
const merge = require('lodash/merge');
const mergeWith = require('lodash/mergeWith');

const realFetch = require('./fetch');

function preventComplexMerge(objValue, srcValue) {
  if (!isObjectLike(objValue) && !isObjectLike(srcValue)) {
    return undefined;
  }

  if (!isPlainObject(objValue) || !isPlainObject(srcValue)) {
    return srcValue || objValue;
  }

  return mergeWith({}, objValue, srcValue, preventComplexMerge);
}

/**
 * @template {Gofer<T>} T
 */
class Gofer {
  constructor(config, serviceName, clientVersion, clientName) {
    config = config || {};
    serviceName = serviceName;
    clientVersion = clientVersion;
    clientName = clientName || serviceName;

    const globalDefaults = config.globalDefaults || {};
    const serviceDefaults = config[serviceName] || {};
    this.defaults = merge(
      {
        serviceName: serviceName,
        clientVersion: clientVersion,
        clientName: clientName,
        endpointDefaults: {},
      },
      globalDefaults,
      serviceDefaults
    );
  }

  /**
   * If a subclass exposes a custom constructor, it can provide
   * a different implementation. For example it could pass down
   * additional dependencies.
   */
  clone() {
    /** @typedef {{ new(config: object): T }} ClientType */
    const Client = /** @type {ClientType} */ (this.constructor || Gofer);
    const config = { globalDefaults: this.defaults };
    return new Client(config);
  }

  with(overrides) {
    const cloned = this.clone();
    merge(cloned.defaults, overrides);
    return cloned;
  }

  _mapOptions(options) {
    return options;
  }

  _prepareOptions(options) {
    const endpointName = options.endpointName;
    const mergedOptions = mergeWith(
      {},
      this.defaults,
      this.defaults.endpointDefaults[endpointName],
      options,
      preventComplexMerge
    );
    return this._mapOptions(mergedOptions);
  }

  fetch(uri, options = {}, callback) {
    return realFetch(uri, this._prepareOptions(options), callback);
  }
}
module.exports = { Gofer, fetch: realFetch };
