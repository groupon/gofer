'use strict'
http = require 'http'
{EventEmitter} = require 'events'

assert = require 'assertive'
express = require 'express'
Gofer = require '../'

expressProxy = require '../proxy'

class EchoClient extends Gofer
  serviceName: 'echo'

EchoClient.prototype.addOptionMapper (options) ->
  if options.headers['x-fail-mapper']
    throw new Error 'OptionMapperError'

  options

class ProxyClient extends Gofer
  serviceName: 'proxy'

describe 'proxy', ->
  echoClient = null
  proxyClient = null

  before 'setup echo app', (done) ->
    echoServer = http.createServer (req, res) ->
      {url, method, headers} = req

      if url.indexOf('network-error') != -1
        req.socket.destroy()
        return # ECONNRESET

      if headers['if-none-match']
        res.statusCode = 304
        res.end()
        return

      res.statusCode = 401 if url.indexOf('server-error') != -1
      res.setHeader 'Content-Type', 'application/json'
      chunks = []
      req.on 'data', (chunk) -> chunks.push chunk
      req.on 'end', ->
        body = Buffer.concat(chunks).toString 'utf8'
        res.end JSON.stringify {url, method, headers, body}

    echoServer.listen 0, ->
      echoClient = new EchoClient {
        echo:
          baseUrl: "http://127.0.0.1:#{echoServer.address().port}/other/base"
          qs:
            client_id: 'some-client-id'
      }
      done()

  before 'setup proxy app', (done) ->
    proxyApp = express()
    proxyApp.use '/api/v2', (req, res, next) ->
      expressProxy echoClient, req, res, next

    proxyApp.use (err, req, res, next) ->
      res.statusCode = 500
      res.json {
        fromErrorMiddleware: true
        message: err.message
        code: err.code
        syscall: err.syscall
      }

    proxyServer = http.createServer proxyApp
    proxyServer.listen 0, ->
      proxyClient = new ProxyClient {
        proxy:
          minStatusCode: 200
          maxStatusCode: 599
          baseUrl: "http://127.0.0.1:#{proxyServer.address().port}"
      }
      done()

  describe 'successful request', ->
    reqEcho = null
    before (done) ->
      proxyClient.fetch '/api/v2/some/path?x=42', {
        method: 'POST'
        json: { some: { body: 'data' } }
        qs: { more: 'query stuff' }
      }, (err, data) ->
        reqEcho = data
        done err

    it 'forwards the method', ->
      assert.equal 'POST', reqEcho.method

    it 'removes the middleware mount point from the url', ->
      [urlPath, query] = reqEcho.url.split '?'
      assert.equal '/other/base/some/path', urlPath
      assert.equal 'client_id=some-client-id&x=42&more=query%20stuff', query

    it 'forwards the request body', ->
      assert.equal '{"some":{"body":"data"}}', reqEcho.body

  it 'forwards 304s', ->
    proxyClient.fetch('/api/v2/not-modified', {
      headers:
        'if-none-match': 'last-etag'
    }).asPromise().then ([body, res]) ->
      assert.equal 304, res.statusCode
      assert.equal '', body

  it 'fails cleanly with a throwing option mapper', ->
    proxyClient.fetch('/api/v2/some/path', {
      headers: { 'x-fail-mapper': '1' }
    }).then (error) ->
      assert.expect error.fromErrorMiddleware
      assert.equal 'OptionMapperError', error.message

  it 'forwards 4xx', ->
    proxyClient.fetch('/api/v2/server-error', {
      method: 'POST'
      json: { some: { body: 'data' } }
      qs: { more: 'query stuff' }
      headers:
        'x-my-header': 'header-value'
    }).asPromise().then ([body, res]) ->
      assert.equal 401, res.statusCode
      assert.equal 'header-value', body.headers['x-my-header']

  it 'wraps network errors', ->
    proxyClient.fetch('/api/v2/network-error', {
      method: 'POST'
      json: { some: { body: 'data' } }
      qs: { more: 'query stuff' }
    }).then (error) ->
      assert.expect error.fromErrorMiddleware
      assert.equal 'ECONNRESET', error.code
