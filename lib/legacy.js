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

function hasJsonHeader(res) {
  var contentType = res.headers['content-type'];
  if (!contentType) return false;
  return contentType.indexOf('application/json') === 0;
}

function isJsonResponse(res, body) {
  return hasJsonHeader(res) && body && body.length > 0;
}

function safeParseJSON(source) {
  var data = { parseError: null, body: source };
  try {
    data.body = JSON.parse(source);
  } catch (parseError) {
    data.parseError = parseError;
  }
  return data;
}

function wrapForCallback(promise, callback) {
  function onResponse(error, response) {
    if (error) {
      return callback(error, error.body, response);
    }
    function onBody(bodyError, body) {
      if (bodyError) {
        return callback(bodyError, null, response);
      }
      if (isJsonResponse(response, body)) {
        var result = safeParseJSON(body.toString());
        return callback(result.parseError, result.body, response);
      }
      callback(null, body, response);
    }
    response.rawBody().nodeify(onBody);
  }
  promise.nodeify(onResponse);
}
module.exports = wrapForCallback;
