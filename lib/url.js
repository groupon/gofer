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

const url = require('url');

function applyBaseUrl(urlObj, baseUrl) {
  // If the url already is absolute, baseUrl isn't needed.
  if (urlObj.hostname) return urlObj;

  const base = url.parse(baseUrl);

  if (base.query) {
    throw new Error('baseUrl may not contain a query string');
  }

  const basePath = base.pathname && base.pathname !== '/' ? base.pathname : '';

  return {
    // Protocol/auth/hostname/port always apply
    protocol: base.protocol,
    auth: base.auth,
    host: base.host,
    hostname: base.hostname,
    port: base.port,

    // For the pathname, we join. E.g. http://host/v2 + /my-resource
    pathname: basePath + (urlObj.pathname || '') || '/',
    query: urlObj.query,
  };
}
exports.applyBaseUrl = applyBaseUrl;

function replacePathParams(pathname, pathParams) {
  pathParams = pathParams || {};

  function onPlaceHolder(match, fromCurly, fromEscaped) {
    const key = fromCurly || fromEscaped;
    const value = pathParams[fromCurly || fromEscaped];
    if (value === undefined) {
      throw new Error(`Missing value for path param ${key}`);
    }
    return encodeURIComponent(value);
  }

  return pathname.replace(/\{(\w+)\}|%7B(\w+)%7D/g, onPlaceHolder);
}
exports.replacePathParams = replacePathParams;
