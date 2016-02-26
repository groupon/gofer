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

{omit} = require 'lodash'
Url = require 'url'

module.exports = (client, req, res, next) ->
  {pathname, query} = Url.parse req.url, true

  options =
    method: req.method
    headers: omit req.headers, ['host']
    uri: pathname
    qs: omit query, [ 'callback' ]
    # Make sure we don't polute logs with errors that aren't errors
    # Browsers like to send If-Not-Modified-Since etc.
    minStatusCode: 200
    maxStatusCode: 399

  # The explicit handling of an error passed into cb
  # is because of a weirdness in gofer where failing option mappers
  # lead to undefined being defined and the callback being called
  # directly. Gross.
  properReturnValue = false
  proxyReq = client.request options, (err) ->
    return if properReturnValue
    next(err) if err?

  properReturnValue = proxyReq?

  if properReturnValue
    proxyReq.on 'error', next
    req.pipe(proxyReq).pipe(res)
