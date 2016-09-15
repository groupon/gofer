'use strict'
http = require 'http'
Url = require 'url'

assert = require 'assertive'

Gofer = require '..'

unexpected = ->
  throw new Error 'Unexpected success'

describe 'promiseHelpers', ->
  myApi = null
  server = null

  defaultConfig =
    globalDefaults:
      appName: 'myApp'
      appSha: 'mySha'
    myApi: {}

  before (done) ->
    server = http.createServer ({url, method, headers}, res) ->
      if Url.parse(url).pathname == '/v1/zapp'
        res.writeHead 200, 'Content-Type': 'application/json'
        res.end JSON.stringify {url, method, headers}
      else if url == '/v1/crash'
        res.socket.destroy()
      else
        res.writeHead 404, 'Content-Type': 'application/json'
        res.end JSON.stringify { message: 'not found' }

    server.listen 0, ->
      {port} = @address()
      defaultConfig.myApi.baseUrl = "http://127.0.0.1:#{port}/v1"
      done()

  after (done) ->
    if server?
      try server.close()
    done()

  beforeEach ->
    zappEndpoint = (request) -> (cb) -> request "/zapp", cb
    queryEndpoint = (request) -> (cb) -> request "/zapp?p=1", cb
    undefEndpoint = (request) -> (cb) ->
      qs = { a: undefined, b: null, c: 'non-null' }
      request "/zapp", { qs }, cb
    undefHeadersEndpoint = (request) -> (cb) ->
      headers = { a: undefined, b: null, c: 'non-null' }
      request "/zapp", { headers }, cb
    failEndpoint = (request) -> (cb) -> request "/invalid", cb
    crashEndpoint = (request) -> (cb) -> request '/crash', cb

    class MyApi extends Gofer
      serviceName: 'myApi'
      serviceVersion: '1.0.0'

    MyApi::registerEndpoints {
      zapp: zappEndpoint
      fail: failEndpoint
      query: queryEndpoint
      undef: undefEndpoint
      undefHeaders: undefHeadersEndpoint
      crash: crashEndpoint
    }

    MyApi::addOptionMapper (options) ->
      throw new Error 'ForcedThrow' if options.forceThrow
      options

    myApi = new MyApi defaultConfig

  it 'reacts properly to low-level errors', ->
    myApi.crash().then unexpected, (err) ->
      assert.equal 'socket hang up', err.message

  it 'passes through errors', ->
    myApi.fail().then unexpected, (err) ->
      OUT_OF_RANGE = 'API Request returned a response outside the status code range (code: 404, range: [200, 299])'
      assert.equal OUT_OF_RANGE, err.message
      assert.equal 'not found', err.body.message

  it 'exposes the parsed response body', ->
    myApi.query().getBody().then (reqMirror) ->
      assert.equal '/v1/zapp?p=1', reqMirror.url

  it 'exposes the response', ->
    myApi.zapp().getResponse().then (res) ->
      assert.equal 200, res.statusCode

  it 'can act as a pseudo-thenable', ->
    myApi.query().then (reqMirror) ->
      assert.equal '/v1/zapp?p=1', reqMirror.url

  it 'passes through option mapper errors to .then', ->
    myApi.with(forceThrow: true).zapp().then().then unexpected, (err) ->
      assert.equal 'ForcedThrow', err.message

  it 'passes through option mapper errors to .then(onSuccess, onError)', ->
    myApi.with(forceThrow: true).zapp().then unexpected, (err) ->
      assert.equal 'ForcedThrow', err.message

  it 'passes through option mapper errors to .getBody', ->
    myApi.with(forceThrow: true).zapp().getBody().then unexpected, (err) ->
      assert.equal 'ForcedThrow', err.message

  it 'passes through option mapper errors to .getResponse', ->
    myApi.with(forceThrow: true).zapp().getResponse().then unexpected, (err) ->
      assert.equal 'ForcedThrow', err.message

  it 'passes through option mapper errors to .asPromise', ->
    myApi.with(forceThrow: true).zapp().asPromise().then unexpected, (err) ->
      assert.equal 'ForcedThrow', err.message
