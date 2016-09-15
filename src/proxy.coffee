###
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
###

Bluebird = require 'bluebird'
{omit} = require 'lodash'
Url = require 'url'

module.exports = (client, req, res, next) ->
  {pathname, query} = Url.parse req.url, true

  options =
    method: req.method
    headers: omit req.headers, ['host']
    body: req
    qs: omit query, [ 'callback' ]
    # Make sure we don't polute logs with errors that aren't errors
    # Browsers like to send If-Not-Modified-Since etc.
    minStatusCode: 200
    maxStatusCode: 399

  proxyReq = client.fetch pathname, options

  handleProxyResponse = (proxyRes) ->
    new Bluebird (resolve, reject) ->
      proxyRes.on 'error', reject
      proxyRes.pipe res
      proxyRes.on 'end', resolve

  piped =
    if typeof proxyReq.pipe == 'function'
      handleProxyResponse proxyReq
    else
      proxyReq.then handleProxyResponse

  piped.then null, next
