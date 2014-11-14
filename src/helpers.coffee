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

{merge, isObject, reduce} = require 'lodash'
Url = require 'url'

@resolveOptional = (uri, options, cb) ->
  if 'function' == typeof options
    cb = options
    options = null
  else if 'function' != typeof cb
    cb = ->

  if 'string' == typeof uri
    options ?= {}
    options.uri = uri
  else
    options = uri

  {options, cb}

@parseDefaults = (rawConfig, serviceName) ->
  rawConfig ?= {}
  globalDefaults = rawConfig.globalDefaults ? {}
  serviceDefaults = rawConfig[serviceName] ? {}

  defaults = merge {}, globalDefaults, serviceDefaults

  endpointDefaults = defaults.endpointDefaults ? {}
  delete defaults.endpointDefaults
  { defaults, endpointDefaults }

@applyBaseUrl = (baseUrl, options) ->
  uri = options.uri
  uri = Url.parse uri if 'string' == typeof uri
  baseUrl = Url.parse baseUrl if 'string' == typeof baseUrl

  basePath =
    if baseUrl.pathname.substr(-1) == '/'
      baseUrl.pathname.substr(0, baseUrl.pathname.length - 1)
    else
      baseUrl.pathname

  pathname = "#{basePath}#{uri.pathname}"
  {protocol, hostname, port} = baseUrl
  {query, search} = uri

  uri = Url.format {protocol, hostname, port, pathname, query, search}
  options.uri = replacePathParams(uri, options.pathParams)
  options

@buildUserAgent = (options) ->
  {serviceVersion, serviceName, appSha, appName, fqdn} = options

  "#{serviceName}/#{serviceVersion}; #{appName}/#{appSha}; #{fqdn}"

replacePathParams = (uri, pathParams) ->
  return uri unless isObject pathParams

  wrappedPathParams = reduce pathParams, ((acc, value, tag) ->
    wrappedTag = "{#{tag}}"
    acc[wrappedTag] = encodeURIComponent(value)
    acc
  ), {}

  wrappedTags = Object.keys(wrappedPathParams)
  regex = new RegExp wrappedTags.join("|"), "g"

  return uri.replace regex, (match) ->
    wrappedPathParams[match]
