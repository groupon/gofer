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

{EventEmitter} = require 'events'
http = require 'http'
https = require 'https'
request = require 'request'
uuid = require 'node-uuid'
microtime = require 'microtime'
{extend, map} = require 'lodash'
debug = require('debug') 'gofer:hub'

# Default timeout intervals
module.exports = Hub = ->

  hub = new EventEmitter

  hub.fetch = (options, cb) ->
    fetchStart = microtime.nowDouble()

    fetchId = generateUUID()

    options.timeout ?= Hub.requestTimeout

    options.headers ?= {}
    options.method = if options.method?
      options.method.toUpperCase()
    else
      'GET'
    hubHeaders = generateHeaders options.requestId, fetchId
    extend options.headers, hubHeaders

    logPendingRequests http.globalAgent
    logPendingRequests https.globalAgent

    responseData =
      fetchStart: fetchStart
      requestOptions: options
      requestId: options?.requestId
      fetchId: fetchId

    debug '-> %s', options.method, options.uri
    hub.emit 'start', responseData

    req = request options, (error, response, body) ->
      responseData.fetchEnd = microtime.nowDouble()
      responseData.fetchDuration = responseData.fetchEnd - responseData.fetchStart

      # Reset responseData.requestOptions.uri in case the request library modified it
      # (eg, if requestOptions had a qs key)
      responseData.requestOptions.uri = this.uri

      uri = formatUri(responseData.requestOptions.uri)

      logLine =
        statusCode: response?.statusCode
        uri: uri
        method: options.method
        connectDuration: responseData.connectDuration
        fetchDuration: responseData.fetchDuration
        requestId: options?.requestId
        fetchId: fetchId

      if error?
        logLine.syscall = error.syscall
        logLine.statusCode = error.code
        logLine.error = error
        debug '<- %s', error.code, uri
        hub.emit 'fetchError', logLine
        return cb error, body

      apiError = null
      minStatusCode = options.minStatusCode or 200
      maxStatusCode = options.maxStatusCode or 299
      successfulRequest = minStatusCode <= response.statusCode <= maxStatusCode
      if successfulRequest
        debug '<- %s', response.statusCode, uri
        hub.emit 'success', logLine
      else
        apiError = new Error "API Request returned a response outside the status code range (code: #{response.statusCode}, range: [#{minStatusCode}, #{maxStatusCode}])"
        apiError.type = 'api_response_error'
        apiError.httpHeaders = response.headers
        apiError.body = body
        apiError.statusCode = response.statusCode
        apiError.minStatusCode = logLine.minStatusCode = minStatusCode
        apiError.maxStatusCode = logLine.maxStatusCode = maxStatusCode
        debug '<- %s', response.statusCode, uri
        hub.emit 'failure', logLine

      cb apiError, body, response, responseData

    connectTimeoutInterval = options.connectTimeout ? Hub.connectTimeout
    completionTimeoutInterval = options.completionTimeout
    setupConnectTimeout connectTimeoutInterval, completionTimeoutInterval, req, responseData, options
    return req

  logPendingRequests = ({requests, maxSockets}) ->
    return unless Object.keys(requests).length > 0
    queueReport = for host, queue of requests
      "#{host}: #{queue.length}"
    hub.emit 'socketQueueing', { maxSockets, queueReport }

  # This will setup a timer to make sure we don't wait too long for the
  # connection to the remote server to be established. It is standard practice
  # for this value to be significantly lower than the "request" timeout when
  # making requests to internal endpoints.
  setupConnectTimeout = (connectTimeoutInterval, completionTimeoutInterval, request, responseData) ->
    request.on 'request', (req) ->
      req.on 'socket', (socket) ->
        connectTimeout = undefined
        connectionTimedOut = ->
          req.abort()

          responseData.connectDuration = microtime.nowDouble() - responseData.fetchStart

          err = new Error 'ECONNECTTIMEDOUT'
          err.code = 'ECONNECTTIMEDOUT'
          err.message = "Connecting to #{responseData.requestOptions.method} " +
          "#{responseData.requestOptions.uri} timed out after #{connectTimeoutInterval}ms"
          err.responseData = responseData
          req.emit 'error', err

        connectionSuccessful = ->
          responseData.connectDuration = microtime.nowDouble() - responseData.fetchStart
          hub.emit 'connect', responseData

          clearTimeout connectTimeout
          connectTimeout = null

          setupCompletionTimeout completionTimeoutInterval, req, responseData

        connectingSocket = socket.socket ? socket
        connectingSocket.on 'connect', connectionSuccessful
        connectTimeout = setTimeout connectionTimedOut, connectTimeoutInterval

  # This will setup a timer to make sure we don't wait to long for the response
  # to complete. The semantics are as follows:
  # connectTimeout + timeout (first byte) + completionTimeout = total timeout
  setupCompletionTimeout = (completionTimeoutInterval, req, responseData) ->
    return unless completionTimeoutInterval
    completionTimeout = undefined

    completionTimedOut = ->
      req.abort()

      responseData.completionDuration = microtime.nowDouble() - responseData.connectDuration

      err = new Error 'ETIMEDOUT'
      err.code = 'ETIMEDOUT'
      err.message = "Response timed out after #{completionTimeoutInterval}ms"
      err.responseData = responseData
      req.emit 'error', err

    completionSuccessful = ->
      responseData.completionDuration = microtime.nowDouble() - responseData.connectDuration

      clearTimeout completionTimeout
      completionTimeout = null

    req.on 'complete', completionSuccessful
    completionTimeout = setTimeout completionTimedOut, completionTimeoutInterval

  return hub

generateUUID = ->
  uuid.v1().replace /-/g, ''

generateHeaders = (requestId, fetchId) ->
  headers =
    'Connection': 'close'
    'X-Fetch-ID': fetchId

  headers['X-Request-ID'] = requestId if requestId?
  headers

formatUri = (uri) ->
  if typeof uri == 'object'
    uri.href
  else
    uri

Hub.connectTimeout = 1000
Hub.requestTimeout = 10000
