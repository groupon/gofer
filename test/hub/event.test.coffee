assert = require 'assertive'
bond = require 'bondjs'
hub = require('../../hub')()
serverBuilder = require './_test_server'

clone = (thing) -> JSON.parse JSON.stringify thing

server = app = undefined
describe 'Events', ->
  before (done) ->
    {server} = serverBuilder()
    server.listen 89001, done

  socketQueueSpy = bond()
  errorSpy = bond()

  after (done) ->
    server.close done

  describe 'success event', ->
    successSpy = undefined
    before (done) ->
      successSpy = bond()
      hub.on 'success', successSpy

      hub.fetch {
        uri: "http://localhost:89001"
        requestId: 'abcde'
      },
      (err, body, headers) ->
        done()

    it 'fires with a log line', ->
      assert.truthy successSpy.called
      assert.hasType Object, successSpy.calledArgs[successSpy.called-1][0]
      logLine = successSpy.calledArgs[successSpy.called-1][0]
      assert.equal 200, logLine.statusCode
      assert.equal "http://localhost:89001/", logLine.uri
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
        uri: "http://localhost:89001"
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
      assert.equal "http://localhost:89001/", logLine.uri
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
          uri: "http://localhost:89001/error"
          requestId: 'abcde'
        },
        (err, body, headers) ->
          done()

      it 'fires with a log line', ->
        assert.truthy failureSpy.called
        assert.hasType Object, failureSpy.calledArgs[failureSpy.called-1][0]
        logLine = failureSpy.calledArgs[failureSpy.called-1][0]
        assert.equal 500, logLine.statusCode
        assert.equal '200..299', logLine.statusCodeRange
        assert.equal "http://localhost:89001/error", logLine.uri
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
          uri: "http://localhost:89001"
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
        assert.equal '250..499', logLine.statusCodeRange
        assert.equal "http://localhost:89001/?__status=201", logLine.uri
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
        connectTimeout: 10
      },
      (err, body, headers) ->
        done()

    it 'fires with a log line', ->
      assert.equal 0, successSpy.called
      assert.truthy fetchErrorSpy.called
      assert.hasType Object, fetchErrorSpy.calledArgs[fetchErrorSpy.called-1][0]
      assert.equal 'ECONNECTTIMEDOUT', fetchErrorSpy.calledArgs[fetchErrorSpy.called-1][0].error.code
      logLine = fetchErrorSpy.calledArgs[fetchErrorSpy.called-1][0]
      assert.equal "http://10.255.255.1/", logLine.uri
      assert.equal "GET", logLine.method
      assert.equal 'abcde', logLine.requestId
      assert.truthy 'did not define connect duration', logLine.connectDuration?
      assert.truthy 'did not define fetch duration', logLine.fetchDuration?
      assert.truthy 'did not define fetch id', logLine.fetchId?
      assert.equal 'ECONNECTTIMEDOUT', logLine.error?.code


