assert = require 'assertive'
http = require 'http'
Url = require 'url'

Gofer = require '..'

describe 'Making requests w/ promises', ->
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
    verifyError = (err) ->
      assert.equal 'socket hang up', err?.message

    myApi.crash().response
      .catch(verifyError)
      .nodeify(done)

  it 'passes through errors', (done) ->
    verifyError = (err) ->
      OUT_OF_RANGE = 'API Request returned a response outside the status code range (code: 404, range: [200..299])'
      assert.equal OUT_OF_RANGE, err?.message
      assert.equal 'not found', err.body.message

    myApi.fail().response
      .catch(verifyError)
      .nodeify(done)

  it 'can return the raw body', (done) ->
    verifyBody = (body) ->
      assert.hasType String, body
      assert.equal '{"url":', body.substr(0, 7)

    myApi.with(encoding: 'utf8').zapp().getRawBody()
      .then(verifyBody)
      .nodeify(done)

  it 'can return the parsed body', (done) ->
    verifyBody = (body) ->
      assert.equal '/v1/zapp', body.url
      assert.hasType String, body.headers['x-fetch-id']
      assert.equal 'sneaky header', body.headers['x-sneaky']

      userAgent = body.headers['user-agent']
      assert.include 'myApi/1.0.0', userAgent
      assert.include 'myApp/mySha', userAgent

    req = myApi.with({
      headers: { 'x-sneaky': 'sneaky header' }
    }).zapp()

    req.then(verifyBody).nodeify(done)
