
assert = require 'assertive'
http = require 'http'
Url = require 'url'

Gofer = require '..'

describe 'actually making a request', ->
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
      crash: crashEndpoint
    }

    myApi = new MyApi defaultConfig

  it 'reacts properly to low-level errors', (done) ->
    req = myApi.crash (err, data, response, responseData) ->
      assert.equal 'socket hang up', err?.message
      done()

  it 'passes through errors', (done) ->
    req = myApi.fail (err, data, response, responseData) ->
      OUT_OF_RANGE = 'API Request returned a response outside the status code range (code: 404, range: [200..299])'
      assert.equal OUT_OF_RANGE, err?.message
      assert.equal 'not found', data?.message
      done()

  it 'does not swallow query parameters', (done) ->
    req = myApi.query (err, reqMirror) ->
      assert.equal undefined, err?.stack
      assert.equal '/v1/zapp?p=1', reqMirror.url
      done()

  it 'does not send undefined/null query parameters', (done) ->
    req = myApi.undef (err, reqMirror) ->
      assert.equal undefined, err?.stack
      assert.equal '/v1/zapp?c=non-null', reqMirror.url
      done()

  ['put','post','patch','del','head','get'].forEach (verb) ->
    httpMethod = verb.toUpperCase()
    httpMethod = 'DELETE' if verb == 'del'

    describe "convenience method for #{httpMethod}", ->
      before (done) ->
        myApi[verb] {
          uri: '/{id}'
          pathParams: { id: 'zapp' }
        }, (error, @reqMirror, @response, @stats) =>
          done error

      it 'exposes basic requestOptions in the stats', ->
        assert.equal '/v1/zapp', @stats.requestOptions.pathname
        assert.equal httpMethod, @stats.method

      xit 'adds serviceName/endpointName/methodName/pathParams', ->
        assert.equal undefined, @stats.endpointName
        assert.equal 'myApi', @stats.serviceName
        assert.equal httpMethod.toLowerCase(), @stats.methodName
        assert.deepEqual { id: 'zapp' }, @stats.pathParams

  it 'makes a request', (done) ->
    req = myApi.with({
      headers: { 'x-sneaky': 'sneaky header' }
    }).zapp (err, reqMirror) ->
      assert.equal undefined, err?.stack
      assert.equal '/v1/zapp', reqMirror.url
      assert.hasType String, reqMirror.headers['x-fetch-id']
      assert.equal 'sneaky header', reqMirror.headers['x-sneaky']

      userAgent = reqMirror.headers['user-agent']
      assert.include 'myApi/1.0.0', userAgent
      assert.include 'myApp/mySha', userAgent

      done()
