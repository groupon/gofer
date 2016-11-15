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
util = require 'util'

request = require 'request'
HRDuration = require 'hrduration'
uuid = require 'node-uuid'
{extend, map, mapValues, once} = require 'lodash'
debug = require('debug') 'gofer:hub'
DefaultPromise = global.Promise ? require 'bluebird'

{ safeParseJSON, isJsonResponse } = require './json'
promiseHelpers = require './promise'

checkTimeout = (timeout) ->
  if typeof timeout != 'number'
    # This prevents confusing late errors in io.js which don't have a helpful stack
    throw new Error util.format(
      'Invalid timeout: %j, not a number', timeout
    )

  timeout

# Invalid header chars cause uncatchable errors in node 4.x+ thanks to request
removeInvalidHeaderChars = (header) ->
  # Ported from checkInvalidHeaderChar in node's lib/_http_common.js
  # RegExp equivalent of:
  # ch != 9 && (ch <= 31 || ch > 255 || ch == 127)
  # Where `ch` is a character code (e.g. `str.charCodeAt(idx)`)
  "#{header}".replace /(?:\x7F|[^\x09\x20-\xFF])+/g, ''

setIOTimeout = (callback, ms) ->
  initialHandle = null
  delayHandle = null
  done = false

  onDelay = ->
    return if done
    done = true
    delayHandle = null
    callback()

  onTimer = ->
    return if done
    initialHandle = null
    delayHandle = setImmediate onDelay

  cancel = ->
    return if done
    done = true
    clearTimeout initialHandle
    clearImmediate delayHandle
    initialHandle = delayHandle = null

  initialHandle = setTimeout onTimer, ms
  return cancel

clearIOTimeout = (handle) ->
  return unless handle
  handle()

# Default timeout intervals
module.exports = Hub = ->
  hub = new EventEmitter
  hub.Promise = DefaultPromise

  hub.fetch = (options, done) ->
    {getSeconds} = HRDuration()

    fetchId = generateUUID()

    headerTimeoutInterval = checkTimeout options.timeout ? Hub.requestTimeout
    delete options.timeout
    connectTimeoutInterval = checkTimeout options.connectTimeout ? Hub.connectTimeout

    options.headers ?= {}
    options.method = if options.method?
      options.method.toUpperCase()
    else
      'GET'
    hubHeaders = generateHeaders options.requestId, fetchId
    extend options.headers, hubHeaders
    options.headers = mapValues options.headers, removeInvalidHeaderChars

    logPendingRequests http.globalAgent
    logPendingRequests https.globalAgent

    responseData =
      requestId: options.requestId
      fetchId: fetchId

    baseLog = extend({
      uri: options.uri
      method: options.method
    }, options.logData, responseData)

    Object.defineProperty responseData, 'requestOptions', value: options
    Object.defineProperty baseLog, 'requestOptions', value: options

    debug '-> %s', options.method, options.uri
    hub.emit 'start', baseLog

    handleResult = (error, response, body) ->
      parseJSON = options.parseJSON ? isJsonResponse(response, body)
      {parseError, body} = safeParseJSON body, response if parseJSON
      error ?= parseError

      responseData.fetchDuration = getSeconds()

      # Reset options.uri in case the request library modified it
      # (eg, if requestOptions had a qs key)
      options.uri = this.uri

      uri = formatUri(options.uri)

      logLine = extend({
        statusCode: response?.statusCode
        uri: uri
        method: options.method
        connectDuration: responseData.connectDuration
        fetchDuration: responseData.fetchDuration
        requestId: options.requestId
        fetchId: fetchId
      }, options.logData)

      if error?
        logLine.code = error.code
        logLine.message = error.message
        logLine.syscall = error.syscall
        logLine.statusCode = error.code
        debug '<- %s', error.code, uri
        hub.emit 'fetchError', logLine
        error.responseData ?= responseData
        process.nextTick -> sendResult error, body
        return

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
        apiError.responseData ?= responseData
        debug '<- %s', response.statusCode, uri
        hub.emit 'failure', logLine

      sendResult apiError, body, response, responseData

    sendResult = (error, data, response, responseData) ->
      req.emit 'goferResult', error, data, response, responseData

    req = request options, handleResult

    completionTimeoutInterval = options.completionTimeout
    setupTimeouts headerTimeoutInterval, connectTimeoutInterval, completionTimeoutInterval, req, responseData, getSeconds

    if typeof done == 'function'
      req.on 'goferResult', done

    req.Promise = hub.Promise

    return Object.defineProperties req, promiseHelpers

  logPendingRequests = ({requests, maxSockets}) ->
    return unless Object.keys(requests).length > 0
    queueReport = for host, queue of requests
      "#{host}: #{queue.length}"
    hub.emit 'socketQueueing', { maxSockets, queueReport }

  # This will setup a timer to make sure we don't wait too long for the
  # connection to the remote server to be established. It is standard practice
  # for this value to be significantly lower than the "request" timeout when
  # making requests to internal endpoints.
  setupTimeouts = (headerTimeoutInterval, connectTimeoutInterval, completionTimeoutInterval, request, responseData, getSeconds) ->
    request.on 'request', (req) ->
      fireTimeoutError = once ->
        # Ported from request's timeout logic
        return unless request.req
        req.abort()
        e = new Error 'ETIMEDOUT'
        e.code = 'ETIMEDOUT'
        e.connect = req.socket && req.socket.readable == false
        request.emit 'error', e

      req.setTimeout headerTimeoutInterval, ->
        req.setTimeout 1, -> fireTimeoutError

      headerTimeout = setIOTimeout fireTimeoutError, headerTimeoutInterval

      onHeadersReceived = -> clearIOTimeout headerTimeout

      req.on 'response', onHeadersReceived

      req.on 'socket', (socket) ->
        connectTimeout = undefined
        connectionTimedOut = ->
          req.abort()

          responseData.connectDuration = getSeconds()

          err = new Error 'ECONNECTTIMEDOUT'
          err.code = 'ECONNECTTIMEDOUT'
          err.message = "Connecting to #{responseData.requestOptions.method} " +
          "#{responseData.requestOptions.uri} timed out after #{connectTimeoutInterval}ms"
          err.responseData = responseData
          req.emit 'error', err

        connectionSuccessful = ->
          responseData.connectDuration = getSeconds()
          hub.emit 'connect', responseData

          clearIOTimeout connectTimeout
          connectTimeout = null

          setupCompletionTimeout completionTimeoutInterval, req, responseData, getSeconds

        connectingSocket = socket.socket ? socket
        connectingSocket.on 'connect', connectionSuccessful
        connectTimeout = setIOTimeout connectionTimedOut, connectTimeoutInterval

  # This will setup a timer to make sure we don't wait to long for the response
  # to complete. The semantics are as follows:
  # connectTimeout + timeout (first byte) + completionTimeout = total timeout
  setupCompletionTimeout = (completionTimeoutInterval, req, responseData, getSeconds) ->
    return unless completionTimeoutInterval
    completionTimeout = undefined

    completionTimedOut = ->
      req.abort()

      responseData.completionDuration = getSeconds() - responseData.connectDuration

      err = new Error 'ETIMEDOUT'
      err.code = 'ETIMEDOUT'
      err.message = "Response timed out after #{completionTimeoutInterval}ms"
      err.responseData = responseData
      req.emit 'error', err

    completionSuccessful = ->
      responseData.completionDuration = getSeconds() - responseData.connectDuration

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
