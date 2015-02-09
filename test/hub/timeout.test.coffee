assert = require 'assertive'
hub = require('../../hub')()
serverBuilder = require './_test_server'

server = app = undefined
describe 'Basic Integration Test', ->
  before (done) ->
    {server} = serverBuilder()
    server.listen 0, =>
      {@port} = server.address()
      done()

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
        uri: "http://127.0.0.1:#{@port}"
        qs: {__latency: 10}
        timeout: 20
      }, (err, body, headers) ->
        done err

    it 'passes an error when timeout is exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__latency: 30}
        timeout: 20
      }, (err, body, headers) ->
        assert.equal 'ETIMEDOUT', err?.code
        done()

  describe 'completion timeout', ->

    it 'does not pass an error when timeout is not exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__delay: 10}
        completionTimeout: 20
      }, (err, body, headers) ->
        throw err if err
        assert.expect not err
        done err

    it 'passes an error when timeout is exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__delay: 30}
        completionTimeout: 20
      }, (err, body, headers) ->
        assert.expect err
        assert.equal 'ETIMEDOUT', err.code
        done()

  describe 'combined timeouts', ->

    it 'does not pass an error when timeout and completion timeouts are not exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__latency: 20, __delay: 20}
        timeout: 30
        connectTimeout: 30
        completionTimeout: 50
      }, (err, body, headers) ->
        throw err if err
        assert.expect not err
        done err

    it 'passes an error when completion is exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__delay: 20}
        timeout: 30
        connectTimeout: 30
        completionTimeout: 10
      }, (err, body, headers) ->
        assert.expect err
        assert.equal 'ETIMEDOUT', err.code
        done()

    it 'passes an error when connection is exceeded', (done) ->
      hub.fetch {
        uri: "http://10.255.255.1"
        timeout: 10000,
        connectTimeout: 50
        completionTimeout: 60000
      }, (err, body, headers) ->
        assert.expect err
        assert.equal 'ECONNECTTIMEDOUT', err.code
        done()

    it 'passes an error when timeout is exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__latency: 20, __delay: 20}
        timeout: 1
        connectTimeout: 30
        completionTimeout: 30
      }, (err, body, headers) ->
        assert.expect err
        assert.equal 'ETIMEDOUT', err.code
        done()

