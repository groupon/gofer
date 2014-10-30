assert = require 'assertive'

{replacePathParms} = require '../lib/helpers'

describe 'replacePathParms', ->
  it 'makes no changes without a pathParams object', ->
    uri = replacePathParms "/first/{tag}", "else"
    assert.equal "/first/{tag}", uri

    uri = replacePathParms "/second/{tag}", null
    assert.equal "/second/{tag}", uri

    uri = replacePathParms "/third/{tag}"
    assert.equal "/third/{tag}", uri

  it 'replaces keys', ->
    pathParams =
      country: "us"
      id: "half-off"

    uri = replacePathParms "/{country}/deal/{id}", pathParams
    assert.equal "/us/deal/half-off", uri

  it 'replaces duplicate keys', ->
    pathParams =
      country: "us"

    uri = replacePathParms "/{country}/deal/{country}", pathParams
    assert.equal "/us/deal/us", uri

  it 'values are properly URI encoded', ->
    pathParams =
      country: "us"
      id: "!@#"

    uri = replacePathParms "/{country}/deal/{id}", pathParams
    assert.equal "/us/deal/!%40%23", uri
