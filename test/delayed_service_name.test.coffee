'use strict'

assert = require 'assertive'

Gofer = require '../'

describe 'Delayed serviceName handling', ->
  # Simulates the following ES proposal:
  #   https://gist.github.com/jeffmo/054df782c05639da2adb
  #
  # ```
  # class ClassPropStyle extends Gofer {
  #   serviceName = 'classPropStyle';
  # }
  # ```
  #
  # Keepin' on being forward-compatible.
  class ClassPropStyle extends Gofer
    constructor: (options, hub) ->
      super options, hub
      @serviceName = 'classPropStyle'

  it 'extracts the right defaults', ->
    client = new ClassPropStyle {
      classPropStyle:
        baseUrl: 'http://foo.bar:8080'
    }
    assert.equal 'http://foo.bar:8080', client.defaults.baseUrl
