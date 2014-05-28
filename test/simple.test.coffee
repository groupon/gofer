
assert = require 'assertive'

buildGofer = require '..'

describe 'gofer', ->
  it 'exports a function', ->
    assert.hasType Function, buildGofer

  describe 'with service name', ->
    MyApi = buildGofer 'myApi'

    it 'is a class, taking two arguments', ->
      assert.hasType Function, MyApi
      assert.equal 2, MyApi.length

    it 'exposes the service name', ->
      assert.equal 'myApi', MyApi.serviceName
