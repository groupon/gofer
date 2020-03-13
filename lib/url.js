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

/**
 * @typedef {string | QSVal[] | { [name: string]: QSVal }} QSVal
 *
 * @param {URLSearchParams} query
 * @param {{ [name: string]: QSVal }} qs
 * @param {Array<string>} [path]
 */
function updateSearch(query, qs, path = []) {
  if (qs instanceof URLSearchParams) {
    for (const [key, val] of qs.entries()) query.append(key, val);
    return query;
  }

  for (const [key, val] of Object.entries(qs || {})) {
    if (val == null) continue;
    if (typeof val === 'object') updateSearch(query, val, [...path, key]);
    else {
      const [first, ...rest] = [...path, key];
      query.set(`${first}${rest.map(r => `[${r}]`).join('')}`, val);
    }
  }
  return query;
}
exports.updateSearch = updateSearch;

/**
 * @param {string} pathname
 * @param {{ [name: string]: string }} pathParams
 */
function replacePathParams(pathname, pathParams) {
  pathParams = pathParams || {};

  /**
   * @param {string} match
   * @param {string} fromCurly
   * @param {string} fromEscaped
   */
  function onPlaceHolder(match, fromCurly, fromEscaped) {
    const key = fromCurly || fromEscaped;
    const value = pathParams[fromCurly || fromEscaped];
    if (value === undefined) {
      throw new Error(`Missing value for path param ${key}`);
    }
    return encodeURIComponent(value);
  }

  return pathname.replace(/{(\w+)}|%7B(\w+)%7D/g, onPlaceHolder);
}
exports.replacePathParams = replacePathParams;
