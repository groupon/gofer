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
var http = require('http');
var https = require('https');
var parseUrl = require('url').parse;

var assign = require('lodash/assign');
var qsParser = require('qs');

var urlUtils = require('./url');
var request = require('./request');
var wrapForCallback = require('./legacy');

var applyBaseUrl = urlUtils.applyBaseUrl;
var replacePathParams = urlUtils.replacePathParams;

var DEFAULT_CONNECT_TIMEOUT = 1000;
var DEFAULT_TIMEOUT = 10 * 1000;

var agentsByService = {};
function getAgentsForService(options) {
  var serviceName = options.serviceName;
  var agents = agentsByService[serviceName];
  if (!agents) {
    agents = agentsByService[serviceName] = {
      http: new http.Agent(),
      https: new https.Agent(),
    };
  }
  return agents;
}

function isValidBody(body) {
  return body === undefined ||
    Buffer.isBuffer(body) || typeof body === 'string' ||
    (body && typeof body.pipe === 'function');
}

function validateBody(body) {
  if (!isValidBody) {
    throw new TypeError('Invalid body ' + typeof body);
  }
  return body;
}

function getAgent(options, urlObj) {
  var agent;
  var isHttps = urlObj.protocol === 'https:';
  if (options.agent === false) {
    return isHttps ? new https.Agent() : new http.Agent();
  }

  if (isHttps) {
    agent = options.agent || getAgentsForService(options).https;
  } else {
    agent = options.agent || getAgentsForService(options).http;
  }

  return agent;
}

function generateSearch(queryString, qs) {
  var query = assign(qsParser.parse(queryString), qs || {});
  var filtered = {};
  var queryKeys = Object.keys(query)
    .filter(function ensureSet(key) {
      var value = query[key];
      var isSet = value !== null && value !== undefined;
      if (isSet) {
        filtered[key] = value;
      }
      return isSet;
    });

  if (queryKeys.length === 0) return '';
  return '?' + qsParser.stringify(filtered);
}

function filterHeaders(headers) {
  var filtered = {};
  Object.keys(headers).forEach(function ensureSet(name) {
    var value = headers[name];
    if (value !== null && value !== undefined) {
      filtered[name] = headers[name];
    }
  });
  return filtered;
}

function unifyAuth(auth) {
  if (typeof auth === 'string') return auth;
  if (!auth) return null;
  if (typeof auth !== 'object') {
    throw new TypeError('Invalid auth option ' + typeof auth);
  }
  var user = auth.user || auth.username;
  var pass = auth.pass || auth.password;
  if (typeof user !== 'string' || typeof pass !== 'string') {
    throw new TypeError('Auth has to be a user/pass pair');
  }
  return user + ':' + pass;
}

function buildUserAgent(options) {
  return (
    (options.clientName || 'noServiceName') + '/' +
    (options.clientVersion || 'noServiceVersion') + ' (' +
    (options.appName || 'noAppName') + '/' +
    (options.appSha || 'noAppSha') + '; ' +
    (options.fqdn || 'noFQDN') + ')'
  );
}

function defaultTimeout(value, defaultValue) {
  if (value >= 0) {
    if (typeof value !== 'number') {
      throw new TypeError(
        'Invalid timeout ' + JSON.stringify(value) + ', not a number');
    }
    return value;
  }
  return defaultValue;
}

function defaultStatusCode(value, defaultValue) {
  // Disable this check, e.g. minStatusCode = false => don't check for it.
  if (value === false) return false;

  if (value >= 0) {
    if (typeof value !== 'number') {
      throw new TypeError(
        'Invalid status code ' + JSON.stringify(value) + ', not a number');
    }
    return value;
  }
  return defaultValue;
}

function _fetch(urlObj, options) {
  if (options.baseUrl && typeof options.baseUrl === 'string') {
    urlObj = applyBaseUrl(urlObj, options.baseUrl);
  }

  var defaultHeaders = {
    'Accept-Encoding': 'gzip',
    'User-Agent': buildUserAgent(options),
  };
  var body = validateBody(options.body);
  var json = options.json;
  var form = options.form;

  if (json !== undefined && json !== null) {
    defaultHeaders['Content-Type'] = 'application/json;charset=UTF-8';
    body = JSON.stringify(json);
  } else if (form !== undefined && form !== null) {
    if (typeof form !== 'object') {
      throw new TypeError(
        'Invalid form body (' + typeof form + ', expected object)');
    }
    defaultHeaders['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
    body = qsParser.stringify(form);
  }

  var hostname = urlObj.hostname;
  if (!hostname || typeof hostname !== 'string') {
    throw new Error('Invalid URI ' + JSON.stringify(hostname));
  }

  var agent = getAgent(options, urlObj);
  assign(agent.options, {
    // http:
    keepAlive: options.keepAlive,
    // https:
    pfx: options.pfx,
    key: options.key,
    passphrase: options.passphrase,
    cert: options.cert,
    ca: options.ca,
    ciphers: options.ciphers,
    rejectUnauthorized: options.rejectUnauthorized !== false,
    secureProtocol: options.secureProtocol,
  });
  assign(agent, {
    maxSockets: options.maxSockets || Infinity,
    keepAliveMsecs: options.keepAliveMsecs || 1000,
    keepAlive: !!options.keepAlive,
    maxFreeSockets: options.maxFreeSockets || 256,
  });

  var method = options.method || 'GET';
  return request({
    agent: agent,
    protocol: urlObj.protocol,
    host: urlObj.host,
    hostname: hostname,
    port: urlObj.port,
    method: method,
    path: replacePathParams(urlObj.pathname, options.pathParams) + generateSearch(urlObj.query, options.qs),
    headers: filterHeaders(assign(defaultHeaders, options.headers)),
    auth: unifyAuth(options.auth || urlObj.auth),
    localAddress: options.localAddress,
    body: body,
    connectTimeout: defaultTimeout(options.connectTimeout, DEFAULT_CONNECT_TIMEOUT),
    timeout: defaultTimeout(options.timeout, DEFAULT_TIMEOUT),
    minStatusCode: defaultStatusCode(options.minStatusCode, 200),
    maxStatusCode: defaultStatusCode(options.maxStatusCode, 299),
    // Some things we might want to expose for instrumentation to pick up:
    serviceName: options.serviceName,
    endpointName: options.endpointName,
    methodName: options.methodName || method.toLowerCase(),
    pathParams: options.pathParams,
  });
}

function nodeify(promise, callback) {
  if (!callback) return promise;
  if (typeof callback !== 'function') {
    throw new TypeError('Expected callback to be a function');
  }
  wrapForCallback(promise, callback);
}

function fetch(url, options, callback) {
  if (typeof url !== 'string') {
    throw new TypeError('url has to be a string');
  }
  return nodeify(_fetch(parseUrl(url), options || {}), callback);
}

module.exports = fetch;
