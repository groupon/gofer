
assert = require 'assertive'

Gofer = require '..'

describe 'gofer', ->
  it 'exports a constructor function', ->
    assert.hasType Function, Gofer

  it 'takes two arguments', ->
    assert.equal 2, Gofer.length

  describe 'with service name', ->
    class MyApi extends Gofer
      serviceName: 'myApi'

    it 'is a Gofer', ->
      assert.truthy new MyApi() instanceof Gofer
