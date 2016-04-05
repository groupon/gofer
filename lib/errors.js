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

var util = require('util');

function StatusCodeError(statusCode, min, max, headers) {
  Error.call(this);

  this.message = util.format(
    'API Request returned a response outside the status code range (code: %s, range: [%s, %s])',
    statusCode, min, max);
  this.headers = headers;
  this.statusCode = statusCode;
  this.minStatusCode = min;
  this.maxStatusCode = max;
}
util.inherits(StatusCodeError, Error);
exports.StatusCodeError = StatusCodeError;

function exportError(ctor) {
  util.inherits(ctor, StatusCodeError);
  exports[ctor.name] = ctor;
}

function RedirectError(statusCode, min, max, headers) {
  StatusCodeError.call(this, statusCode, min, max, headers);
}
exportError(RedirectError);

function NotModifiedError(statusCode, min, max, headers) {
  StatusCodeError.call(this, statusCode, min, max, headers);
}
exportError(NotModifiedError);

function BadRequestError(min, max, headers) {
  StatusCodeError.call(this, 400, min, max, headers);
}
exportError(BadRequestError);

function NotFoundError(min, max, headers) {
  StatusCodeError.call(this, 404, min, max, headers);
}
exportError(NotFoundError);

StatusCodeError.create = function createError(statusCode, min, max, headers) {
  var error;
  switch (statusCode) {
    case 301:
    case 302:
    case 303:
    case 307:
    case 308:
      error = new RedirectError(statusCode, min, max, headers);
      break;

    case 304:
      error = new NotModifiedError(statusCode, min, max, headers);
      break;

    case 400:
      error = new BadRequestError(min, max, headers);
      break;

    case 404:
      error = new NotFoundError(min, max, headers);
      break;

    default:
      error = new StatusCodeError(statusCode, min, max, headers);
      break;
  }
  Error.captureStackTrace(error, createError);
  return error;
};
