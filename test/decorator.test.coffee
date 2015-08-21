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
    myApi:
      endpointDefaults:
        getThing:
          qs: { a: 13 }

  before (done) ->
    server = http.createServer ({url, method, headers}, res) ->
      if Url.parse(url).pathname == '/v1/zapp'
        res.writeHead 200, 'Content-Type': 'application/json'
        res.end JSON.stringify {url, method, headers}
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
    # This is the desugared version of something like this:
    #
    # ```js
    # class MyApi extends Gofer {
    #   serviceName = 'myApi';
    #   serviceVersion = 'myApi';
    #
    #   @Gofer.Endpoint
    #   getThing(request, kind) {
    #     return request(`/v1/${kind}`);
    #   }
    # }
    # ```
    #
    # See: https://github.com/wycats/javascript-decorators
    class MyApi extends Gofer
      serviceName: 'myApi'
      serviceVersion: '1.0.0'

    propertyDescriptor = Gofer.Endpoint MyApi.prototype, 'getThing', {
      value: (request, kind) ->
        request "/#{kind}"
    }
    Object.defineProperty MyApi.prototype, 'getThing', propertyDescriptor

    # Random prototype read to make sure it's safe to scan the prototype
    MyApi::getThing

    myApi = new MyApi defaultConfig

  it 'can be called without the request parameter', ->
    myApi.getThing('zapp').then (reqMirror) ->
      assert.equal '/v1/zapp?a=13', reqMirror.url
