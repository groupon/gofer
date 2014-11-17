assert = require 'assertive'
hub = require('../../hub')()
serverBuilder = require './_test_server'

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
        qs: {__latency: 20}
        timeout: 40
      }, (err, body, headers) ->
        done err

    it 'passes an error when timeout is exceeded', (done) ->
      hub.fetch {
        uri: "http://localhost:89001"
        qs: {__latency: 40}
        timeout: 20
      }, (err, body, headers) ->
        assert.equal 'ETIMEDOUT', err?.code
        done()

  describe 'completion timeout', ->

    it 'does not pass an error when timeout is not exceeded', (done) ->
      hub.fetch {
        uri: "http://localhost:89001"
        qs: {__delay: 20}
        completionTimeout: 40
      }, done

    it 'passes an error when timeout is exceeded', (done) ->
      hub.fetch {
        uri: "http://localhost:89001"
        qs: {__delay: 40}
        completionTimeout: 20
      }, (err, body, headers) ->
        assert.expect err
        assert.equal 'ETIMEDOUT', err.code
        done()

  describe 'combined timeouts', ->

    it 'does not pass an error when timeout and completion timeouts are not exceeded', (done) ->
      hub.fetch {
        uri: "http://localhost:89001"
        qs: {__latency: 20, __delay: 20}
        timeout: 40
        connectTimeout: 40
        completionTimeout: 60
      }, done

    it 'passes an error when completion is exceeded', (done) ->
      hub.fetch {
        uri: "http://localhost:89001"
        qs: {__delay: 40}
        timeout: 60
        connectTimeout: 60
        completionTimeout: 20
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
        uri: "http://localhost:89001"
        qs: {__latency: 20, __delay: 20}
        timeout: 1
        connectTimeout: 30
        completionTimeout: 30
      }, (err, body, headers) ->
        assert.expect err
        assert.equal 'ETIMEDOUT', err.code
        done()
