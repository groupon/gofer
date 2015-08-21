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

{extend} = require 'lodash'

Hub = require './hub'
{
  resolveOptional,
  parseDefaults,
  applyBaseUrl,
  buildUserAgent,
  merge,
  cleanObject
} = require './helpers'
{ safeParseJSON, isJsonResponse } = require './json'

GOOD_FORM_ENCODED = 'application/x-www-form-urlencoded; charset=utf-8'

class Gofer
  constructor: (config, @hub) ->
    { @defaults, @endpointDefaults } = parseDefaults config, @serviceName
    @hub ?= Hub()

  with: (overrides) ->
    copy = new @constructor({}, @hub)
    copy.defaults = merge @defaults, overrides

    # Overides should also hard-override any endpoint default
    copy.endpointDefaults = {}
    for endpointName, endpointDefaults of @endpointDefaults
      copy.endpointDefaults[endpointName] = merge endpointDefaults, overrides

    copy

  clone: -> @with {}

  # For making custom requests
  request: (uri, options, cb) =>
    {options, cb} = resolveOptional uri, options, cb
    @_request options, cb

  # For making custom requests
  put: (uri, options, cb) ->
    {options, cb} = resolveOptional uri, options, cb
    options.method = 'PUT'
    @_request options, cb

  # For making custom requests
  del: (uri, options, cb) ->
    {options, cb} = resolveOptional uri, options, cb
    options.method = 'DELETE'
    @_request options, cb

  # For making custom requests
  head: (uri, options, cb) ->
    {options, cb} = resolveOptional uri, options, cb
    options.method = 'HEAD'
    @_request options, cb

  # For making custom requests
  post: (uri, options, cb) ->
    {options, cb} = resolveOptional uri, options, cb
    options.method = 'POST'
    @_request options, cb

  # For making custom requests
  patch: (uri, options, cb) ->
    {options, cb} = resolveOptional uri, options, cb
    options.method = 'PATCH'
    @_request options, cb

  registerEndpoint: (endpointName, endpointFn) ->
    Object.defineProperty this, endpointName,
      configurable: true
      get: ->
        request = @requestWithDefaults { endpointName }
        value = endpointFn request
        Object.defineProperty this, endpointName, {value}
        value

    return this

  registerEndpoints: (endpointMap) ->
    @registerEndpoint name, handler for name, handler of endpointMap
    return this

  # Main integration point to customize the client
  addOptionMapper: (mapper) ->
    @_mappers = @_mappers.concat [mapper]
    this

  clearOptionMappers: -> @_mappers = []

  # Semi-public, should not be needed normally
  requestWithDefaults: (defaults) ->
    (uri, options, cb) =>
      {options, cb} = resolveOptional uri, options, cb
      options = merge defaults, options
      @_request options, cb

  _getDefaults: (defaults, options) ->
    {endpointName} = options

    if endpointName? && @endpointDefaults[endpointName]?
      defaults = merge defaults, @endpointDefaults[endpointName]

    defaults

  # Helper for request mappers
  applyBaseUrl: applyBaseUrl

  _applyMappers: (originalOptions) ->
    @_mappers.reduce(
      (options, mapper) => mapper.call this, options
      originalOptions
    )

  _request: (options, cb) ->
    defaults = @_getDefaults @defaults, options

    options.methodName ?= (options.method ? 'get').toLowerCase()
    options.serviceName = @serviceName if @serviceName?
    options.serviceVersion = @serviceVersion if @serviceVersion?

    try
      options = @_applyMappers merge(defaults, options)
    catch err
      return cb err

    options.headers ?= {}
    options.headers['User-Agent'] ?= buildUserAgent(options)

    if options.qs?
      options.qs = cleanObject options.qs

    if options.headers?
      options.headers = cleanObject options.headers

    options.logData ?= {}
    extend(options.logData, {
      serviceName: options.serviceName
      endpointName: options.endpointName
      methodName: options.methodName
      pathParams: options.pathParams
    })

    # In case an option mapper didn't clean up after itself.
    # In a future version we should investigate offically switching
    # to request's baseUrl option.
    delete options.baseUrl if options.baseUrl

    if typeof cb == 'function'
      req = @hub.fetch options, (error, body, response, responseData) ->
        parseJSON = options.parseJSON ? isJsonResponse(response, body)
        {parseError, body} = safeParseJSON body, response if parseJSON
        error ?= parseError
        # TODO: remove flipping of response and responseData with next major
        cb error, body, responseData, response
    else
      req = @hub.fetch options

    # Fix up the content-type header to match request 2.40's behavior,
    # shielding gofer users from the new behavior.[1]
    # Some services don't properly default to decoding form-encoded data as utf8,
    # instead using a "non-utf8 character encoding" (whatever that means).
    #
    # [1] https://github.com/request/request/pull/1159
    #     https://github.com/request/request/issues/1644
    if options.form && options.forceFormEncoding != false
      req.setHeader 'Content-Type', GOOD_FORM_ENCODED

    return req

  _mappers: [
    # Default: apply baseUrl
    (opts) ->
      {baseUrl} = opts
      if baseUrl?
        delete opts.baseUrl
        @applyBaseUrl baseUrl, opts
      else opts
  ]

Gofer::fetch = Gofer::request
Gofer::get = Gofer::request

Gofer.Endpoint = Endpoint = (obj, endpointName, { value: innerFn }) ->
  if typeof innerFn != 'function'
    throw new TypeError '@Endpoint expects a function property'

  enumerable: false
  configurable: true
  writeable: true
  get: ->
    return innerFn if obj == this
    request = @requestWithDefaults { endpointName }
    value = innerFn.bind this, request
    Object.defineProperty this, endpointName, {
      enumerable: false
      value
    }
    value

module.exports = Gofer
Gofer['default'] = Gofer # ES6 module compatible
