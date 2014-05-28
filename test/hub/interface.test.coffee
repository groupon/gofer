assert = require 'assertive'
hub = require '../../hub'

describe 'Interface Test', ->
  it "has a default connect timeout of 1 second", ->
    assert.equal 1000, hub.connectTimeout

  it "has a default request timeout of 10 seconds", ->
    assert.equal 10000, hub.requestTimeout
