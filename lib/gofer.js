
/*
Copyright (c) 2014, Groupon, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

Neither the name of GROUPON nor the names of its contributors may be
used to endorse or promote products derived from this software without
specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var GOOD_FORM_ENCODED, Gofer, Hub, applyBaseUrl, buildUserAgent, cleanObject, extend, isJsonResponse, merge, parseDefaults, ref, ref1, resolveOptional, safeParseJSON,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

extend = require('lodash').extend;

Hub = require('./hub');

ref = require('./helpers'), resolveOptional = ref.resolveOptional, parseDefaults = ref.parseDefaults, applyBaseUrl = ref.applyBaseUrl, buildUserAgent = ref.buildUserAgent, merge = ref.merge, cleanObject = ref.cleanObject;

ref1 = require('./json'), safeParseJSON = ref1.safeParseJSON, isJsonResponse = ref1.isJsonResponse;

GOOD_FORM_ENCODED = 'application/x-www-form-urlencoded; charset=utf-8';

Gofer = (function() {
  function Gofer(config, hub) {
    var ref2;
    this.hub = hub;
    this.request = bind(this.request, this);
    ref2 = parseDefaults(config, this.serviceName), this.defaults = ref2.defaults, this.endpointDefaults = ref2.endpointDefaults;
    if (this.hub == null) {
      this.hub = Hub();
    }
  }

  Gofer.prototype["with"] = function(overrides) {
    var copy, endpointDefaults, endpointName, ref2;
    copy = new this.constructor({}, this.hub);
    copy.defaults = merge(this.defaults, overrides);
    copy.endpointDefaults = {};
    ref2 = this.endpointDefaults;
    for (endpointName in ref2) {
      endpointDefaults = ref2[endpointName];
      copy.endpointDefaults[endpointName] = merge(endpointDefaults, overrides);
    }
    return copy;
  };

  Gofer.prototype.clone = function() {
    return this["with"]({});
  };

  Gofer.prototype.request = function(uri, options, cb) {
    var ref2;
    ref2 = resolveOptional(uri, options, cb), options = ref2.options, cb = ref2.cb;
    return this._request(options, cb);
  };

  Gofer.prototype.put = function(uri, options, cb) {
    var ref2;
    ref2 = resolveOptional(uri, options, cb), options = ref2.options, cb = ref2.cb;
    options.method = 'PUT';
    return this._request(options, cb);
  };

  Gofer.prototype.del = function(uri, options, cb) {
    var ref2;
    ref2 = resolveOptional(uri, options, cb), options = ref2.options, cb = ref2.cb;
    options.method = 'DELETE';
    return this._request(options, cb);
  };

  Gofer.prototype.head = function(uri, options, cb) {
    var ref2;
    ref2 = resolveOptional(uri, options, cb), options = ref2.options, cb = ref2.cb;
    options.method = 'HEAD';
    return this._request(options, cb);
  };

  Gofer.prototype.post = function(uri, options, cb) {
    var ref2;
    ref2 = resolveOptional(uri, options, cb), options = ref2.options, cb = ref2.cb;
    options.method = 'POST';
    return this._request(options, cb);
  };

  Gofer.prototype.patch = function(uri, options, cb) {
    var ref2;
    ref2 = resolveOptional(uri, options, cb), options = ref2.options, cb = ref2.cb;
    options.method = 'PATCH';
    return this._request(options, cb);
  };

  Gofer.prototype.registerEndpoint = function(endpointName, endpointFn) {
    Object.defineProperty(this, endpointName, {
      configurable: true,
      get: function() {
        var request, value;
        request = this.requestWithDefaults({
          endpointName: endpointName
        });
        value = endpointFn(request);
        Object.defineProperty(this, endpointName, {
          value: value
        });
        return value;
      }
    });
    return this;
  };

  Gofer.prototype.registerEndpoints = function(endpointMap) {
    var handler, name;
    for (name in endpointMap) {
      handler = endpointMap[name];
      this.registerEndpoint(name, handler);
    }
    return this;
  };

  Gofer.prototype.addOptionMapper = function(mapper) {
    this._mappers = this._mappers.concat([mapper]);
    return this;
  };

  Gofer.prototype.clearOptionMappers = function() {
    return this._mappers = [];
  };

  Gofer.prototype.requestWithDefaults = function(defaults) {
    return (function(_this) {
      return function(uri, options, cb) {
        var ref2;
        ref2 = resolveOptional(uri, options, cb), options = ref2.options, cb = ref2.cb;
        options = merge(defaults, options);
        return _this._request(options, cb);
      };
    })(this);
  };

  Gofer.prototype._getDefaults = function(defaults, options) {
    var endpointName;
    endpointName = options.endpointName;
    if ((endpointName != null) && (this.endpointDefaults[endpointName] != null)) {
      defaults = merge(defaults, this.endpointDefaults[endpointName]);
    }
    return defaults;
  };

  Gofer.prototype.applyBaseUrl = applyBaseUrl;

  Gofer.prototype._applyMappers = function(originalOptions) {
    return this._mappers.reduce((function(_this) {
      return function(options, mapper) {
        return mapper.call(_this, options);
      };
    })(this), originalOptions);
  };

  Gofer.prototype._request = function(options, cb) {
    var base, defaults, err, error1, ref2, req;
    defaults = this._getDefaults(this.defaults, options);
    if (options.methodName == null) {
      options.methodName = ((ref2 = options.method) != null ? ref2 : 'get').toLowerCase();
    }
    if (this.serviceName != null) {
      options.serviceName = this.serviceName;
    }
    if (this.serviceVersion != null) {
      options.serviceVersion = this.serviceVersion;
    }
    try {
      options = this._applyMappers(merge(defaults, options));
    } catch (error1) {
      err = error1;
      return cb(err);
    }
    if (options.headers == null) {
      options.headers = {};
    }
    if ((base = options.headers)['User-Agent'] == null) {
      base['User-Agent'] = buildUserAgent(options);
    }
    if (options.qs != null) {
      options.qs = cleanObject(options.qs);
    }
    if (options.headers != null) {
      options.headers = cleanObject(options.headers);
    }
    if (options.logData == null) {
      options.logData = {};
    }
    extend(options.logData, {
      serviceName: options.serviceName,
      endpointName: options.endpointName,
      methodName: options.methodName,
      pathParams: options.pathParams
    });
    if (options.baseUrl) {
      delete options.baseUrl;
    }
    if (typeof cb === 'function') {
      req = this.hub.fetch(options, function(error, body, response, responseData) {
        var parseError, parseJSON, ref3, ref4;
        parseJSON = (ref3 = options.parseJSON) != null ? ref3 : isJsonResponse(response, body);
        if (parseJSON) {
          ref4 = safeParseJSON(body, response), parseError = ref4.parseError, body = ref4.body;
        }
        if (error == null) {
          error = parseError;
        }
        return cb(error, body, responseData, response);
      });
    } else {
      req = this.hub.fetch(options);
    }
    if (options.form && options.forceFormEncoding !== false) {
      req.setHeader('Content-Type', GOOD_FORM_ENCODED);
    }
    return req;
  };

  Gofer.prototype._mappers = [
    function(opts) {
      var baseUrl;
      baseUrl = opts.baseUrl;
      if (baseUrl != null) {
        delete opts.baseUrl;
        return this.applyBaseUrl(baseUrl, opts);
      } else {
        return opts;
      }
    }
  ];

  return Gofer;

})();

Gofer.prototype.fetch = Gofer.prototype.request;

Gofer.prototype.get = Gofer.prototype.request;

module.exports = Gofer;

Gofer['default'] = Gofer;
