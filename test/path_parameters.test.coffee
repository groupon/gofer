assert = require 'assertive'

{applyBaseUrl} = require '../lib/helpers'

describe 'applyBaseUrl', ->
  it 'makes no changes without a pathParams object', ->
    baseUrl = "http://127.0.0.1/v2"

    options =
      uri: "/first/{tag}"
      pathParams: "else"
    {uri} = applyBaseUrl baseUrl, options
    assert.equal "http://127.0.0.1/v2/first/{tag}", uri

    options =
      uri: "/second/{tag}"
      pathParams: null
    {uri} = applyBaseUrl baseUrl, options
    assert.equal "http://127.0.0.1/v2/second/{tag}", uri

    options =
      uri: "/third/{tag}"
      pathParams: undefined
    {uri} = applyBaseUrl baseUrl, options
    assert.equal "http://127.0.0.1/v2/third/{tag}", uri

  it 'replaces keys', ->
    baseUrl = "http://127.0.0.1/{country}/v2"
    options =
      uri: "/deal/{id}"
      pathParams:
        country: "us"
        id: "half-off"

    {uri} = applyBaseUrl baseUrl, options
    assert.equal "http://127.0.0.1/us/v2/deal/half-off", uri

  it 'replaces duplicate keys', ->
    baseUrl = "http://127.0.0.1/{country}/v2"
    options =
      uri: "/deal/{country}"
      pathParams:
        country: "us"

    {uri} = applyBaseUrl baseUrl, options
    assert.equal "http://127.0.0.1/us/v2/deal/us", uri

  it 'values are properly URI encoded', ->
    baseUrl = "http://127.0.0.1/{country}/v2"
    options =
      uri: "/deal/{id}"
      pathParams:
        country: "us"
        id: "!@#"

    {uri} = applyBaseUrl baseUrl, options
    assert.equal "http://127.0.0.1/us/v2/deal/!%40%23", uri
