assert = require 'assertive'
bond = require 'bondjs'
proxy = require '../lib/proxy'

describe 'proxy', ->
  client =
    request: bond().return 'proxyReq'

  req =
    pipe: bond()
    url: 'www.something.com/some-url?search=show-me-the-request'
    method: 'some-method'
    headers:
      some: 'some-headers'
      host: 'host-header'
      other: 'other-header'

  req.pipe.return req

  res = {}

  next = bond()

  before ->
    proxy client, req, res, next

  it 'makes a request with the client', ->
    assert.expect client.request.called

  it 'uses the correct parameters', ->
    expectedRequestArgs =
      method: 'some-method'
      headers:
        some: 'some-headers'
        other: 'other-header'
      uri: 'www.something.com/some-url'
      qs:
        search: 'show-me-the-request'
      minStatusCode: 200
      maxStatusCode: 399

    assert.deepEqual expectedRequestArgs, client.request.calledArgs[0][0]

  it 'pipes the proxy request to the original request and response', ->
    assert.equal 'proxyReq', req.pipe.calledArgs[0][0]
    assert.deepEqual res, req.pipe.calledArgs[1][0]
