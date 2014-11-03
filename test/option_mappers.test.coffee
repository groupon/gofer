
assert = require 'assertive'

Gofer = require '..'

describe 'option mappers', ->
  fooEndpoint = null
  MyApi = null
  myApi_onlyGlobal = null
  myApi_local = null

  defaultConfig = { confProp1: '1', confProp2: '2' }
  overrides = { confProp1: 'a', confProp2: 'b' }

  beforeEach ->
    fooEndpoint = (request) ->
      bar: (id, cb) -> request "/foo/bars/#{id}", cb

    class MyApi extends Gofer
      serviceName: 'myApi'
    MyApi::registerEndpoints foo: fooEndpoint

    MyApi::addOptionMapper (opts) ->
      opts.confProp1 = overrides.confProp1
      opts

    MyApi::addOptionMapper (opts) ->
      opts.confProp2 = overrides.confProp2
      opts

    myApi_local = new MyApi myApi: defaultConfig
    myApi_local.addOptionMapper (opts) ->
      opts.localProp = 'localProp'
      opts

    myApi_onlyGlobal = new MyApi myApi: defaultConfig

  describe 'baseUrl handling', ->
    it 'works without a base path', (done) ->
      client = new MyApi myApi: baseUrl: 'http://127.0.0.1'
      client.hub = fetch: (opts, cb) ->
        assert.equal 'http://127.0.0.1/foo/bars/123', opts.uri
        done()
        return {}

      client.foo.bar '123'

    it 'works with a port', (done) ->
      client = new MyApi myApi: baseUrl: 'http://127.0.0.1:3344'
      client.hub = fetch: (opts, cb) ->
        assert.equal 'http://127.0.0.1:3344/foo/bars/123', opts.uri
        done()
        return {}

      client.foo.bar '123'

    it 'works with a "/" base path', (done) ->
      client = new MyApi myApi: baseUrl: 'http://127.0.0.1:3344/'
      client.hub = fetch: (opts, cb) ->
        assert.equal 'http://127.0.0.1:3344/foo/bars/123', opts.uri
        done()
        return {}

      client.foo.bar '123'

    it 'works with a "/v2" base path', (done) ->
      client = new MyApi myApi: baseUrl: 'http://127.0.0.1:3344/v2'
      client.hub = fetch: (opts, cb) ->
        assert.equal 'http://127.0.0.1:3344/v2/foo/bars/123', opts.uri
        done()
        return {}

      client.foo.bar '123'

    it 'works with a "/v2/" base path', (done) ->
      client = new MyApi myApi: baseUrl: 'http://127.0.0.1:3344/v2/'
      client.hub = fetch: (opts, cb) ->
        assert.equal 'http://127.0.0.1:3344/v2/foo/bars/123', opts.uri
        done()
        return {}

      client.foo.bar '123'

  describe 'onlyGlobal', ->
    it 'does not disturb the endpoint function', (done) ->
      myApi_onlyGlobal.hub = fetch: (opts, cb) ->
        assert.equal '/foo/bars/123', opts.uri
        assert.equal 'foo', opts.endpointName
        done()
        return {}

      myApi_onlyGlobal.foo.bar '123'

    it 'applies the global defaults', (done) ->
      myApi_onlyGlobal.hub = fetch: (opts, cb) ->
        assert.equal overrides.confProp1, opts.confProp1
        assert.equal overrides.confProp2, opts.confProp2
        done()
        return {}

      myApi_onlyGlobal.foo.bar '123'
