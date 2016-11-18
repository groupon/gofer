assert = require 'assertive'

hub = require('../../hub')()

serverBuilder = require './_test_server'
remoteServer = require './_remote_server'

checkRequestOptions = (err) ->
  assert.expect 'Includes responseData.requestOptions', err.responseData?.requestOptions?
  assert.notInclude '''
    But requestOptions is not enumerable / included in JSON
  ''', 'requestOptions', Object.keys(err.responseData)

describe 'Basic Integration Test', ->
  before (done) ->
    {@server} = serverBuilder()
    @server.listen 0, =>
      {@port} = @server.address()
      done()

  after (done) ->
    @server.close done

  describe 'timeout in the presence of blocking event loop', ->

    before remoteServer.fork

    after remoteServer.kill

    it 'gives it a last chance', (done) ->
      @timeout 500

      hub.fetch {
        uri: "http://127.0.0.1:#{remoteServer.port}"
        timeout: 100
      }, (err, body, headers) ->
        done err

      blockEventLoop = ->
        endTime = Date.now() + 150
        while Date.now() < endTime
          endTime = endTime

      setTimeout blockEventLoop, 20

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
        checkRequestOptions err
        done()

  describe 'response timeout', ->

    it 'does not pass an error when timeout is not exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__latency: 20}
        timeout: 60
      }, (err, body, headers) ->
        done err

    it 'passes an error when timeout is exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__latency: 60}
        timeout: 20
      }, (err, body, headers) ->
        assert.equal 'ETIMEDOUT', err?.code
        checkRequestOptions err
        done()

  describe 'socket timeout', ->
    it 'emits a ESOCKETTIMEDOUT', (done) ->
      @timeout 500

      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__delay: 100}
        timeout: 50
      }, (err, body, headers) ->
        assert.equal 'ESOCKETTIMEDOUT', err?.code
        checkRequestOptions err
        done()

  describe 'completion timeout', ->

    it 'does not pass an error when timeout is not exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__delay: 20}
        completionTimeout: 50
      }, (err, body, headers) ->
        done err

    it 'passes an error when timeout is exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__delay: 50}
        completionTimeout: 20
      }, (err, body, headers) ->
        assert.equal 'ETIMEDOUT', err?.code
        checkRequestOptions err
        done()

    it 'is triggered by a constant trickle of packages', (done) ->
      @timeout 400

      complain = -> console.error '5s passed'
      setTimeout complain, 5000

      req = hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__chunkDelay: 50, __totalDelay: 1000}
        timeout: 100 # ensure we would not hit the "normal" timeout
        completionTimeout: 200
      }, (err, body, headers) ->
        assert.equal 'ETIMEDOUT', err?.code
        assert.expect err.completion
        checkRequestOptions err
        done()

  describe 'combined timeouts', ->

    it 'does not pass an error when timeout and completion timeouts are not exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__latency: 10, __delay: 10}
        timeout: 30
        connectTimeout: 30
        completionTimeout: 50
      }, (err, body, headers) ->
        done err

    it 'passes an error when completion is exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__delay: 20}
        timeout: 30
        connectTimeout: 30
        completionTimeout: 10
      }, (err, body, headers) ->
        assert.equal 'ETIMEDOUT', err?.code
        checkRequestOptions err
        done()

    it 'passes an error when connection is exceeded', (done) ->
      hub.fetch {
        uri: "http://10.255.255.1"
        timeout: 10000,
        connectTimeout: 50
        completionTimeout: 60000
      }, (err, body, headers) ->
        assert.equal 'ECONNECTTIMEDOUT', err?.code
        checkRequestOptions err
        done()

    it 'passes an error when timeout is exceeded', (done) ->
      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        qs: {__latency: 20, __delay: 20}
        timeout: 1
        connectTimeout: 30
        completionTimeout: 30
      }, (err, body, headers) ->
        assert.equal 'ETIMEDOUT', err?.code
        checkRequestOptions err
        done()
