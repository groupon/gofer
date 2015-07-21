assert = require 'assertive'
bond = require 'bondjs'
hub = require('../../hub')()
serverBuilder = require './_test_server'

clone = (thing) -> JSON.parse JSON.stringify thing

server = app = undefined
describe 'Events', ->
  before (done) ->
    {server} = serverBuilder()
    server.listen 0, =>
      {@port} = server.address()
      done()

  socketQueueSpy = bond()
  errorSpy = bond()

  after (done) ->
    server.close done

  describe 'start event', ->
    startSpy = undefined
    before (done) ->
      startSpy = bond()
      hub.on 'start', startSpy

      hub.fetch {
        uri: "http://127.0.0.1:#{@port}/"
        requestId: 'abcde'
      }, done

    it 'fires with a log line that contains the requestOptions', ->
      assert.truthy startSpy.called
      [logLine] = startSpy.calledArgs[startSpy.called-1]
      assert.hasType Object, logLine
      assert.equal "http://127.0.0.1:#{@port}/", logLine.uri
      assert.equal "GET", logLine.method
      assert.notInclude 'requestOptions is not enumerable', 'requestOptions', Object.keys(logLine)
      assert.hasType 'requestOptions is included', Object, logLine.requestOptions

  describe 'success event', ->
    successSpy = undefined
    before (done) ->
      successSpy = bond()
      hub.on 'success', successSpy

      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        requestId: 'abcde'
      },
      (err, body, headers) ->
        done()

    it 'fires with a log line', ->
      assert.truthy successSpy.called
      assert.hasType Object, successSpy.calledArgs[successSpy.called-1][0]
      logLine = successSpy.calledArgs[successSpy.called-1][0]
      assert.equal 200, logLine.statusCode
      assert.equal "http://127.0.0.1:#{@port}/", logLine.uri
      assert.equal "GET", logLine.method
      assert.equal 'abcde', logLine.requestId
      assert.truthy 'did not define connect duration', logLine.connectDuration
      assert.truthy 'did not define fetch duration', logLine.fetchDuration
      assert.truthy 'did not define fetch id', logLine.fetchId

  describe 'success create event', ->
    successSpy = undefined
    before (done) ->
      successSpy = bond()
      hub.on 'success', successSpy

      hub.fetch {
        uri: "http://127.0.0.1:#{@port}"
        requestId: 'abcde'
        method: 'post'
      },
      (err, body, headers) ->
        done()

    it 'fires with a log line', ->
      assert.truthy successSpy.called
      assert.equal typeof successSpy.calledArgs[successSpy.called-1][0], 'object'
      logLine = successSpy.calledArgs[successSpy.called-1][0]
      assert.equal 201, logLine.statusCode
      assert.equal "http://127.0.0.1:#{@port}/", logLine.uri
      assert.equal "POST", logLine.method
      assert.equal 'abcde', logLine.requestId
      assert.truthy 'did not define connect duration', logLine.connectDuration
      assert.truthy 'did not define fetch duration', logLine.fetchDuration
      assert.truthy 'did not define fetch id', logLine.fetchId

  describe 'failure event on status code outside range', ->
    failureSpy = undefined

    context 'standard', ->
      before (done) ->

        failureSpy = bond()
        hub.on 'failure', failureSpy

        hub.fetch {
          uri: "http://127.0.0.1:#{@port}/error"
          requestId: 'abcde'
        },
        (err, body, headers) ->
          done()

      it 'fires with a log line', ->
        assert.truthy failureSpy.called
        assert.hasType Object, failureSpy.calledArgs[failureSpy.called-1][0]
        logLine = failureSpy.calledArgs[failureSpy.called-1][0]
        assert.equal 500, logLine.statusCode
        assert.equal 200, logLine.minStatusCode
        assert.equal 299, logLine.maxStatusCode
        assert.equal "http://127.0.0.1:#{@port}/error", logLine.uri
        assert.equal "GET", logLine.method
        assert.equal 'abcde', logLine.requestId
        assert.truthy 'did not define connect duration', logLine.connectDuration
        assert.truthy 'did not define fetch duration', logLine.fetchDuration
        assert.truthy 'did not define fetch id', logLine.fetchId

    context 'passed in min max', ->
      before (done) ->

        failureSpy = bond()
        hub.on 'failure', failureSpy

        hub.fetch {
          uri: "http://127.0.0.1:#{@port}"
          qs: {__status: 201}
          requestId: 'abcde'
          minStatusCode: 250
          maxStatusCode: 499
        },
        (err, body, headers) ->
          done()

      it 'fires with a log line', ->
        assert.truthy failureSpy.called
        assert.hasType Object, failureSpy.calledArgs[failureSpy.called-1][0]
        logLine = failureSpy.calledArgs[failureSpy.called-1][0]
        assert.equal 201, logLine.statusCode
        assert.equal 250, logLine.minStatusCode
        assert.equal 499, logLine.maxStatusCode
        assert.equal "http://127.0.0.1:#{@port}/?__status=201", logLine.uri
        assert.equal "GET", logLine.method
        assert.equal 'abcde', logLine.requestId
        assert.truthy 'did not define connect duration', logLine.connectDuration?
        assert.truthy 'did not define fetch duration', logLine.fetchDuration?
        assert.truthy 'did not define fetch id', logLine.fetchId?

  describe 'fetchError event on a timeout', ->
    successSpy = fetchErrorSpy = undefined
    before (done) ->

      successSpy = bond()
      hub.on 'success', successSpy

      fetchErrorSpy = bond()
      hub.on 'fetchError', fetchErrorSpy

      hub.fetch {
        uri: "http://10.255.255.1"
        requestId: 'abcde'
      },
      (err, body, headers) ->
        done()

    it 'fires with a log line', ->
      assert.equal 0, successSpy.called
      assert.truthy fetchErrorSpy.called
      assert.hasType Object, fetchErrorSpy.calledArgs[fetchErrorSpy.called-1][0]
      assert.equal 'ECONNECTTIMEDOUT', fetchErrorSpy.calledArgs[fetchErrorSpy.called-1][0].code
      logLine = fetchErrorSpy.calledArgs[fetchErrorSpy.called-1][0]
      assert.equal "http://10.255.255.1/", logLine.uri
      assert.equal "GET", logLine.method
      assert.equal 'abcde', logLine.requestId
      assert.truthy 'did not define connect duration', logLine.connectDuration?
      assert.truthy 'did not define fetch duration', logLine.fetchDuration?
      assert.truthy 'did not define fetch id', logLine.fetchId?
      assert.equal 'ECONNECTTIMEDOUT', logLine.code


