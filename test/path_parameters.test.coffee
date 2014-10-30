assert = require 'assertive'

{replacePathParms} = require '../lib/helpers'

describe 'replacePathParms', ->
  it 'makes no changes without a pathParams object', ->
    uri = replacePathParms "/something/{tag}", "else"
    assert.equal "/something/{tag}", uri

    uri = replacePathParms "/something/{tag}", null
    assert.equal "/something/{tag}", uri

  it 'replaces keys', ->
    pathParams =
      country: "us"
      id: "half-off"

    uri = replacePathParms "/{country}/deal/{id}", pathParams
    assert.equal "/us/deal/half-off", uri

  it 'values are properly URI encoded', ->
    pathParams =
      country: "us"
      id: "!@#"

    uri = replacePathParms "/{country}/deal/{id}", pathParams
    assert.equal "/us/deal/!%40%23", uri
