assert = require 'assertive'
proxy = require '../lib/proxy'

describe 'proxy', ->
  requestArgs = []

  client =
    request: ->
      requestArgs.push arguments
      'proxyReq'

  pipeArgs = []
  pipe = ->
    pipeArgs.push arguments
    this

  req =
    pipe: pipe
    url: 'www.something.com/some-url?search=show-me-the-request'
    method: 'some-method'
    headers:
      some: 'some-headers'
      host: 'host-header'
      other: 'other-header'
    body:
      'dummy content'

  res = {}

  next = ->

  before ->
    proxy client, req, res, next

  it 'makes a request with the client', ->
    assert.expect requestArgs.length >= 1

  it 'uses the correct parameters', ->
    expectedRequestArgs =
      method: 'some-method'
      headers:
        some: 'some-headers'
        other: 'other-header'
      uri: 'www.something.com/some-url'
      qs:
        search: 'show-me-the-request'
      body: 'dummy content'
      minStatusCode: 200
      maxStatusCode: 399

    assert.deepEqual expectedRequestArgs, requestArgs[0][0]

  it 'pipes the proxy request to the original request and response', ->
    assert.equal 'proxyReq', pipeArgs[0][0]
    assert.deepEqual res, pipeArgs[1][0]
