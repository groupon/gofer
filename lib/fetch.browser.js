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

/* eslint-env browser */
/* global URLSearchParams */
const Url = require('url');

const assign = require('lodash/assign');
const noop = require('lodash/noop');
const partial = require('lodash/partial');
const qsParser = require('qs');

const StatusCodeError = require('./errors').StatusCodeError;
const urlUtils = require('./url');

const applyBaseUrl = urlUtils.applyBaseUrl;
const replacePathParams = urlUtils.replacePathParams;

const DEFAULT_TIMEOUT = 10 * 1000;

if (typeof fetch !== 'function') {
  throw new Error('Requires native fetch or polyfill');
}

function callJSON(res) {
  return res.json();
}

function callText(res) {
  return res.text();
}

const reqProperties = {
  json: {
    value: function json() {
      return this.then(callJSON);
    },
  },

  text: {
    value: function text() {
      return this.then(callText);
    },
  },
};

// Blob or BufferSource or FormData or URLSearchParams or USVString
function isValidBody(body) {
  return (
    body === undefined ||
    typeof body === 'string' ||
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams)
  );
}

function validateBody(body) {
  if (!isValidBody) {
    throw new TypeError(`Invalid body ${typeof body}`);
  }
  return body;
}

function generateSearch(queryString, qs) {
  const query = assign(qsParser.parse(queryString), qs || {});
  const filtered = {};
  const queryKeys = Object.keys(query).filter(key => {
    const value = query[key];
    const isSet = value !== null && value !== undefined;
    if (isSet) {
      filtered[key] = value;
    }
    return isSet;
  });

  if (queryKeys.length === 0) return '';
  return `?${qsParser.stringify(filtered)}`;
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

function parseErrorBody(rawBody) {
  const source = `${rawBody}`;
  try {
    return JSON.parse(source);
  } catch (anyError) {
    return source;
  }
}

function verifyAndExtendResponse(url, options, response) {
  const min = defaultStatusCode(options.minStatusCode, 200);
  const max = defaultStatusCode(options.maxStatusCode, 299);

  function isAcceptableStatus(code) {
    return (min === false || code >= min) && (max === false || code <= max);
  }

  const originalHeaders = response.headers;
  let cachedHeaders;
  function getCachedHeaders() {
    if (!cachedHeaders) {
      cachedHeaders = Object.create(originalHeaders);
      originalHeaders.forEach((value, name) => {
        if (name) {
          cachedHeaders[name] = value;
        }
      });
    }
    return cachedHeaders;
  }

  Object.defineProperties(response, {
    statusCode: { value: response.status },
    headers: { get: getCachedHeaders },
    url: { value: url },
  });

  function generateStatusCodeError(code) {
    const error = StatusCodeError.create(
      code,
      min,
      max,
      response.headers,
      options.method || 'GET',
      url
    );

    function rejectWithBody(body) {
      error.body = body;
      throw error;
    }

    return response
      .text()
      .then(parseErrorBody)
      .then(null, noop)
      .then(rejectWithBody);
  }

  if (!isAcceptableStatus(response.status)) {
    return generateStatusCodeError(response.status);
  }

  return response;
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

function fetchUrl(url, options) {
  if (typeof url !== 'string') {
    throw new TypeError('url has to be a string');
  }

  options = options || {};
  let urlObj = Url.parse(url);
  if (options.baseUrl && typeof options.baseUrl === 'string') {
    urlObj = applyBaseUrl(urlObj, options.baseUrl);
  }

  const json = options.json;
  const form = options.form;
  let body = validateBody(options.body);

  const defaultHeaders = {};

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
    body = qsParser.stringify(form);
  }

  const auth = options.auth;
  if (typeof auth === 'string') {
    defaultHeaders.Authorization = `Basic ${btoa(auth)}`;
  } else if (auth !== null && typeof auth === 'object') {
    defaultHeaders.Authorization = `Basic ${btoa(
      `${auth.username}:${auth.password}`
    )}`;
  }

  const timeout = defaultTimeout(options.timeout, DEFAULT_TIMEOUT);

  const method = options.method || 'GET';
  const nativeOptions = {
    // All official fetch options:
    method: method,
    headers: filterHeaders(assign(defaultHeaders, options.headers)),
    body: body,
    redirect: options.redirect,
    // Some things we might want to expose for instrumentation to pick up:
    serviceName: options.serviceName,
    endpointName: options.endpointName,
    methodName: options.methodName || method.toLowerCase(),
    pathParams: options.pathParams,
  };
  const patchedPathname = replacePathParams(
    urlObj.pathname,
    options.pathParams
  );
  const patchedSearch = generateSearch(urlObj.query, options.qs);
  const patchedUrl = {
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
    port: urlObj.port,
    pathname: patchedPathname,
    search: patchedSearch,
    path: patchedPathname + patchedSearch,
  };
  const nativeUrl = Url.format(patchedUrl);
  const result = new Promise((resolve, reject) => {
    function onTimedOut() {
      const error = new Error(`Fetching from ${urlObj.hostname} timed out`);
      error.code = 'ETIMEDOUT';
      error.timeout = options.timeout;
      reject(error);
    }
    const timeoutHandle = setTimeout(onTimedOut, timeout);
    function killTimeout(response) {
      clearTimeout(timeoutHandle);
      return response;
    }
    Promise.resolve(fetch(nativeUrl, nativeOptions))
      .then(killTimeout)
      .then(partial(verifyAndExtendResponse, nativeUrl, options))
      .then(resolve, reject);
  });
  return Object.defineProperties(result, reqProperties);
}

module.exports = fetchUrl;
