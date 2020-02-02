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
/* eslint-disable node/no-unsupported-features/node-builtins */

const StatusCodeError = require('./errors').StatusCodeError;
const { replacePathParams, updateSearch } = require('./url');

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
    body instanceof URLSearchParams
  );
}

function validateBody(body) {
  if (!isValidBody(body)) {
    throw new TypeError(`Invalid body ${typeof body}`);
  }
  return body;
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
      .then(null, () => {})
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
  options = options || {};

  const {
    auth,
    json,
    form,
    headers,
    method = 'GET',
    redirect,
    serviceName,
    endpointName,
    pathParams,
    methodName,
  } = options;

  let { baseUrl } = options;
  if (!baseUrl && url && (typeof url === 'string' || url instanceof URL)) {
    baseUrl = location.href;
  }
  if (baseUrl) {
    if (baseUrl.includes('?')) {
      throw new Error('baseUrl may not contain a query string');
    }
    if (baseUrl.substr(-1) !== '/') baseUrl += '/';
    if (typeof url === 'string' && url[0] === '/') url = url.substr(1);
  }

  const urlObj = new URL(url, baseUrl);

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
    body = updateSearch(new URLSearchParams(), form).toString();
  }

  if (typeof auth === 'string') {
    defaultHeaders.Authorization = `Basic ${btoa(auth)}`;
  } else if (auth !== null && typeof auth === 'object') {
    defaultHeaders.Authorization = `Basic ${btoa(
      `${auth.username}:${auth.password}`
    )}`;
  }

  const timeout = defaultTimeout(options.timeout, DEFAULT_TIMEOUT);

  const nativeOptions = {
    // All official fetch options:
    method,
    headers: filterHeaders({ ...defaultHeaders, ...headers }),
    body,
    redirect,
    // Some things we might want to expose for instrumentation to pick up:
    serviceName,
    endpointName,
    methodName: methodName || method.toLowerCase(),
    pathParams,
  };

  urlObj.pathname = replacePathParams(urlObj.pathname, options.pathParams);
  updateSearch(urlObj.searchParams, options.qs);

  const nativeUrl = urlObj.toString();

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
      .then(verifyAndExtendResponse.bind(null, nativeUrl, options))
      .then(resolve, reject);
  });
  return Object.defineProperties(result, reqProperties);
}

module.exports = fetchUrl;
