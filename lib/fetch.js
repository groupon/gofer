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

const http = require('http');
const https = require('https');
const { URL, URLSearchParams } = require('url');

const request = require('./request');
const wrapForCallback = require('./legacy');
const { replacePathParams, updateSearch } = require('./url');

const DEFAULT_CONNECT_TIMEOUT = 1000;
const DEFAULT_TIMEOUT = 10 * 1000;

const agentsByService = {};
function getAgentsForService(options) {
  const serviceName = options.serviceName;
  let agents = agentsByService[serviceName];
  if (!agents) {
    agents = agentsByService[serviceName] = {
      http: new http.Agent(),
      https: new https.Agent(),
    };
  }
  return agents;
}

function isValidBody(body) {
  return (
    body === undefined ||
    Buffer.isBuffer(body) ||
    typeof body === 'string' ||
    (body && typeof body.pipe === 'function')
  );
}

function validateBody(body) {
  if (!isValidBody(body)) {
    throw new TypeError(`Invalid body ${typeof body}`);
  }
  return body;
}

function getAgent(options, urlObj) {
  let agent;
  const isHttps = urlObj.protocol === 'https:';
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

function filterHeaders(headers) {
  const filtered = {};
  Object.keys(headers).forEach(name => {
    const value = headers[name];
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
    throw new TypeError(`Invalid auth option ${typeof auth}`);
  }
  const user = auth.user || auth.username;
  const pass = auth.pass || auth.password;
  if (typeof user !== 'string' || typeof pass !== 'string') {
    throw new TypeError('Auth has to be a user/pass pair');
  }
  return `${user}:${pass}`;
}

function buildUserAgent({ clientName, clientVersion, appName, appSha, fqdn }) {
  return `${clientName || 'noServiceName'}/${clientVersion ||
    'noServiceVersion'} (${appName || 'noAppName'}/${appSha ||
    'noAppSha'}; ${fqdn || 'noFQDN'})`;
}

function defaultTimeout(value, defaultValue) {
  if (value >= 0) {
    if (typeof value !== 'number') {
      throw new TypeError(
        `Invalid timeout ${JSON.stringify(value)}, not a number`
      );
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
        `Invalid status code ${JSON.stringify(value)}, not a number`
      );
    }
    return value;
  }
  return defaultValue;
}

const IPv4 = /^\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}$/;
function canApplySearchDomain(hostname) {
  if (hostname === 'localhost') return false;
  if (hostname[hostname.length - 1] === '.') return false;
  // A hostname shouldn't contain ":" (IPv6 adddress) or be an IPv4 address
  return hostname.indexOf(':') === -1 && !IPv4.test(hostname);
}

function buildHostname(hostname, searchDomain) {
  if (!hostname || typeof hostname !== 'string') {
    throw new Error(`Invalid URI ${JSON.stringify(hostname)}`);
  }
  if (searchDomain && canApplySearchDomain(hostname)) {
    return `${hostname}.${searchDomain}.`;
  }
  return hostname;
}

function fetchUrlObj(urlObj, options) {
  const { json, form, baseUrl, qs, headers, pathParams, auth } = options;

  if (baseUrl && typeof baseUrl === 'string') urlObj = new URL(urlObj, baseUrl);

  const defaultHeaders = {
    'Accept-Encoding': 'gzip',
    'User-Agent': buildUserAgent(options),
  };
  let body = validateBody(options.body);

  if (json !== undefined && json !== null) {
    defaultHeaders['Content-Type'] = 'application/json;charset=UTF-8';
    body = JSON.stringify(json);
  } else if (form !== undefined && form !== null) {
    if (typeof form !== 'object') {
      throw new TypeError(
        `Invalid form body (${typeof form}, expected object)`
      );
    }
    defaultHeaders['Content-Type'] =
      'application/x-www-form-urlencoded;charset=UTF-8';
    body = updateSearch(new URLSearchParams(), form).toString();
  }

  const hostname = buildHostname(urlObj.hostname, options.searchDomain);

  const agent = getAgent(options, urlObj);
  Object.assign(agent.options, {
    // http:
    keepAlive: options.keepAlive,
    // https:
    secureContext: options.secureContext,
    pfx: options.pfx,
    key: options.key,
    passphrase: options.passphrase,
    cert: options.cert,
    ca: options.ca,
    ciphers: options.ciphers,
    rejectUnauthorized: options.rejectUnauthorized !== false,
    secureProtocol: options.secureProtocol,
  });
  Object.assign(agent, {
    maxSockets: options.maxSockets || Infinity,
    keepAliveMsecs: options.keepAliveMsecs || 1000,
    keepAlive: !!options.keepAlive,
    maxFreeSockets: options.maxFreeSockets || 256,
  });

  updateSearch(urlObj.searchParams, qs);

  const method = options.method || 'GET';
  return request({
    agent,
    protocol: urlObj.protocol,
    host: urlObj.host,
    hostname,
    port: urlObj.port,
    method,
    path: replacePathParams(urlObj.pathname, pathParams) + urlObj.search,
    headers: filterHeaders({ ...defaultHeaders, ...headers }),
    auth: unifyAuth(auth || (urlObj.username && urlObj)),
    localAddress: options.localAddress,
    body,
    connectTimeout: defaultTimeout(
      options.connectTimeout,
      DEFAULT_CONNECT_TIMEOUT
    ),
    timeout: defaultTimeout(options.timeout, DEFAULT_TIMEOUT),
    completionTimeout: defaultTimeout(options.completionTimeout, 0),
    minStatusCode: defaultStatusCode(options.minStatusCode, 200),
    maxStatusCode: defaultStatusCode(options.maxStatusCode, 299),
    // Some things we might want to expose for instrumentation to pick up:
    serviceName: options.serviceName,
    endpointName: options.endpointName,
    methodName: options.methodName || method.toLowerCase(),
    pathParams: options.pathParams,
  });
}

// eslint-disable-next-line consistent-return
function nodeify(promise, callback) {
  if (!callback) return promise;
  if (typeof callback !== 'function') {
    throw new TypeError('Expected callback to be a function');
  }
  wrapForCallback(promise, callback);
}

function fetch(url, options, callback) {
  if (!options) options = {};
  let { baseUrl } = options;
  if (baseUrl) {
    if (baseUrl.includes('?')) {
      throw new Error('baseUrl may not contain a query string');
    }
    if (baseUrl.substr(-1) !== '/') baseUrl += '/';
    if (typeof url === 'string' && url[0] === '/') url = url.substr(1);
  }
  return nodeify(
    fetchUrlObj(new URL(url, baseUrl || undefined), options),
    callback
  );
}

module.exports = fetch;
