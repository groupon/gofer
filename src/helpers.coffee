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

cleanProperty = (obj, value, key) ->
  obj[key] = value if value?
  return obj

@cleanObject = (obj) ->
  return obj unless typeof obj == 'object'
  reduce obj, cleanProperty, {}

@merge = mergeSafe = (o1, o2) ->
  # the {} makes sure not to overwrite the values in o1
  merge {}, o1, o2

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

  defaults = mergeSafe globalDefaults, serviceDefaults

  endpointDefaults = defaults.endpointDefaults ? {}
  delete defaults.endpointDefaults
  { defaults, endpointDefaults }

IPv4 = /^\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}$/
canApplySearchDomain = (hostname) ->
  return false if hostname == 'localhost'
  return false if hostname[hostname.length - 1] == '.'
  # A hostname shouldn't contain ":" (IPv6 adddress) or be an IPv4 address
  hostname.indexOf(':') == -1 && !IPv4.test(hostname)

buildHostname = (hostname, searchDomain) ->
  if searchDomain && canApplySearchDomain(hostname)
    return "#{hostname}.#{searchDomain}."
  hostname

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

  {searchDomain} = options
  delete options.searchDomain # in case request starts looking at it
  hostname = buildHostname(hostname, searchDomain)

  uri = Url.format {protocol, hostname, port, pathname, query, search}
  options.uri = replacePathParams(uri, options.pathParams)
  options

@buildUserAgent = (options) ->
  {serviceVersion, serviceName, appSha, appName, fqdn} = options

  serviceVersion ?= "noServiceVersion"
  serviceName ?= "noServiceName"
  appName ?= "noAppName"
  appSha ?= "noAppSha"
  fqdn ?= "noFQDN"

  "#{serviceName}/#{serviceVersion} (#{appName}/#{appSha}; #{fqdn})"

replacePathParams = (uri, pathParams) ->
  return uri unless isObject pathParams

  wrappedPathParams = reduce pathParams, ((acc, value, tag) ->
    encoded = encodeURIComponent value
    wrappedTag = "{#{tag}}"
    encodedWrapped = "%7B#{tag}%7D"
    acc[wrappedTag] = acc[encodedWrapped] = encoded
    acc
  ), {}

  wrappedTags = Object.keys(wrappedPathParams)
  regex = new RegExp wrappedTags.join("|"), "g"

  return uri.replace regex, (match) ->
    wrappedPathParams[match]
