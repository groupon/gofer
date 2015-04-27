assert = require 'assertive'
hub = require('../../hub')()

describe 'Invalid URLs', ->
  it 'error out with sensible error message', (done) ->
    hub.fetch uri: "some-invalid/url", (err, body, headers) ->
      assert.equal 'Invalid protocol: null', err.message
      done()
