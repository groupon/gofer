
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
var Bluebird, Url, omit;

Bluebird = require('bluebird');

omit = require('lodash').omit;

Url = require('url');

module.exports = function(client, req, res, next) {
  var handleProxyResponse, options, pathname, piped, proxyReq, query, ref;
  ref = Url.parse(req.url, true), pathname = ref.pathname, query = ref.query;
  options = {
    method: req.method,
    headers: omit(req.headers, ['host']),
    body: req,
    qs: omit(query, ['callback']),
    minStatusCode: 200,
    maxStatusCode: 399
  };
  proxyReq = client.fetch(pathname, options);
  handleProxyResponse = function(proxyRes) {
    return new Bluebird(function(resolve, reject) {
      proxyRes.on('error', reject);
      proxyRes.pipe(res);
      return proxyRes.on('end', resolve);
    });
  };
  piped = typeof proxyReq.pipe === 'function' ? handleProxyResponse(proxyReq) : proxyReq.then(handleProxyResponse);
  return piped.then(null, next);
};
