
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
var GOFER_PARSED, jsonHeader, nonEmpty;

GOFER_PARSED = 'GOFER_PARSED_RESPONSE';

this.safeParseJSON = function(str, res) {
  var data, err, error;
  if (res == null) {
    return {};
  }
  res[GOFER_PARSED] = true;
  data = {
    parseError: null
  };
  try {
    data.body = 'string' === typeof str ? JSON.parse(str) : str != null ? str : '';
  } catch (error) {
    err = error;
    data.parseError = err;
    data.body = str;
  }
  return data;
};

jsonHeader = function(res) {
  var contentType;
  contentType = res.headers['content-type'];
  if (contentType == null) {
    return false;
  }
  return contentType.indexOf('application/json') === 0;
};

nonEmpty = function(body) {
  return (body != null ? body.length : void 0) > 0;
};

this.isJsonResponse = function(res, body) {
  if (!(res != null ? res.headers : void 0)) {
    return false;
  }
  if (res[GOFER_PARSED]) {
    return false;
  }
  return jsonHeader(res) && nonEmpty(body);
};
