
assert = require 'assertive'

buildGofer = require '..'

describe 'config defaults', ->
  myApi = null

  defaultConfig =
    myApi:
      timeout: 1000
      endpointDefaults:
        foo:
          timeout: 21
    globalDefaults:
      timeout: 100
      connectTimeout: 10
      anotherOption: 71

  beforeEach ->
    fooEndpoint = (request) ->
      bar: (id, cb) -> request "/foo/bars/#{id}", cb

    otherEndpoint = (request) ->
      (cb) -> request "/zapp", cb

    MyApi = buildGofer 'myApi'
    MyApi.registerEndpoints {
      foo: fooEndpoint
      other: otherEndpoint
    }

    myApi = new MyApi defaultConfig

  describe 'global defaults', ->
    it 'apply when not overridden', (done) ->
      myApi.hub = fetch: (opts) ->
        assert.equal '/foo/bars/123', opts.uri
        assert.equal 10, opts.connectTimeout
        done()

      myApi.foo.bar '123'

  describe 'api-specific defaults', ->
    it 'override global defaults', (done) ->
      myApi.hub = fetch: (opts) ->
        assert.equal '/zapp', opts.uri
        assert.equal 1000, opts.timeout
        done()

      myApi.other()

  describe 'endpoint-specific defaults', ->
    it 'override api-specific defaults', (done) ->
      myApi.hub = fetch: (opts) ->
        assert.equal '/foo/bars/23', opts.uri
        assert.equal 21, opts.timeout
        done()

      myApi.foo.bar '23'

  describe 'with overrides', ->
    it 'allows for creating a copy with overrides', (done) ->
      myApi.hub = fetch: (opts) ->
        assert.equal '/foo/bars/23', opts.uri
        assert.equal 10, opts.connectTimeout
        assert.equal 33, opts.timeout
        assert.equal 71, opts.anotherOption
        assert.equal 'custom', opts.customOption
        done()

      myApi.with(timeout: 33, customOption: 'custom').foo.bar '23'
