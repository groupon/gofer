
assert = require 'assertive'

Gofer = require '..'

describe 'registerEndpoint', ->
  fooEndpoint = null
  fooEndpointCalled = 0
  MyApi = null
  myApi = null

  beforeEach ->
    fooEndpointCalled = 0
    fooEndpoint = (request) ->
      ++fooEndpointCalled

      bar: (id, cb) -> request "/foo/bars/#{id}", cb
      customName: (cb) ->
        request uri: '/?a=b', methodName: 'custom', cb

    class MyApi extends Gofer
      serviceName: 'myApi'
    MyApi::registerEndpoints foo: fooEndpoint
    myApi = new MyApi()

  it 'only creates an endpoint once', ->
    myApi.foo
    myApi.foo
    assert.equal 1, fooEndpointCalled

  it 'can call an endpoint', (done) ->
    myApi.hub = fetch: (opts, cb) ->
      assert.equal '/foo/bars/123', opts.uri
      assert.equal 'foo', opts.endpointName
      assert.equal 'myApi', opts.serviceName
      assert.equal 'get', opts.methodName
      done()

    myApi.foo.bar '123'

  it 'allows for custom methodNames', (done) ->
    myApi.hub = fetch: (opts, cb) ->
      assert.equal '/?a=b', opts.uri
      assert.equal 'myApi', opts.serviceName
      assert.equal 'foo', opts.endpointName
      assert.equal 'custom', opts.methodName
      done()

    {foo} = myApi
    foo.customName()

  it 'can call the endpoint when extracted from the api', (done) ->
    myApi.hub = fetch: (opts, cb) ->
      assert.equal '/foo/bars/123', opts.uri
      assert.equal 'foo', opts.endpointName
      done()

    {foo} = myApi
    foo.bar '123'
