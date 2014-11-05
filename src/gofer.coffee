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

Hub = require './hub'
{
  resolveOptional,
  parseDefaults,
  applyBaseUrl,
  buildUserAgent,
  merge
} = require './helpers'
{ safeParseJSON, isJsonResponse } = require './json'
{extend} = require 'lodash'

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

    if options.qs? && typeof options.qs == 'object'
      cleanedQs = {}
      for key, value of options.qs
        cleanedQs[key] = value if value?
      options.qs = cleanedQs

    options.logData ?= {}
    extend({
      serviceName: options.serviceName
      endpointName: options.endpointName
      pathParams: options.pathParams
    }, options.logData)

    @hub.fetch options, (err, body, response, responseData) ->
      parseJSON = options.parseJSON ? isJsonResponse(response, body)
      return cb err, body, responseData, response unless parseJSON

      data = safeParseJSON body
      cb err ? data.error, data.result, responseData, response

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

module.exports = Gofer
Gofer['default'] = Gofer # ES6 module compatible
