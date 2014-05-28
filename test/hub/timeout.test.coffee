assert = require 'assertive'
hub = require('../../hub')()
serverBuilder = require './_test_server'

clone = (thing) -> JSON.parse JSON.stringify thing

server = app = undefined
describe 'Basic Integration Test', ->
  before (done) ->
    {server} = serverBuilder()
    server.listen 89001, done

  after (done) ->
    server.close done

  describe 'connect timeout', ->

    it 'passes an error when connect timeout is exceeded', (done) ->
      # make this test timeout in less than 1s, the default connect timeout value
      @timeout 500

      hub.fetch {
        uri: "http://10.255.255.1"
        timeout: 10000,
        connectTimeout: 50
      },
      (err, body, headers) ->
        assert.equal 'ECONNECTTIMEDOUT', err?.code

        done()

  describe 'response timeout', ->

    it 'does not pass an error when timeout is not exceeded', (done) ->
      hub.fetch {
        uri: "http://localhost:89001"
        qs: {__latency: 10}
        timeout: 20
      }, (err, body, headers) ->
        done err

    it 'passes an error when timeout is exceeded', (done) ->
      hub.fetch {
        uri: "http://localhost:89001"
        qs: {__latency: 30}
        timeout: 20
      }, (err, body, headers) ->
        assert.equal 'ETIMEDOUT', err?.code
        done()
