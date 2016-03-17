assert = require 'assertive'
hub = require('../../hub')()

describe 'Invalid header', ->
  it 'filters out invalid header chars', (done) ->
    hub.fetch {
      uri: 'http://foo.bar'
      headers:
        'x-bad': decodeURIComponent '%00'
    }, (err, body, headers) ->
      assert.equal 'getaddrinfo', err.syscall
      done()
