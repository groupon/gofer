assert = require 'assertive'

{safeParseJSON, isJsonResponse} = require '../lib/json'

describe 'JSON module', ->
  describe 'safeParseJSON method', ->
    it 'will parse valid JSON', ->
      res = {}
      result = safeParseJSON '{"test": 1}', res
      assert.deepEqual {GOFER_PARSED_RESPONSE: true}, res
      assert.deepEqual
        parseError: null
        body: {test: 1}
      , result

    it "will return an empty object if response doesn't exist", ->
      assert.deepEqual {}, safeParseJSON '{"test": 1}'

    it 'will return error & input string when invalid JSON is encountered', ->
      res = {}
      {body, parseError} = safeParseJSON '{i-am-invalid}', res
      assert.equal true, parseError instanceof SyntaxError
      assert.equal '{i-am-invalid}', body

  describe 'isJsonResponse', ->
    body = res = null

    beforeEach ->
      body = '{"test": 1}'
      res =
        headers:
          'content-type': 'application/json'

    it 'will return true for a valid response & body', ->
      assert.equal true, isJsonResponse(res, body)

    it "will return false if headers don't exist", ->
      res = {}
      assert.equal false, isJsonResponse(res, body)

    it "will return false if it's already parsed", ->
      res = {GOFER_PARSED_RESPONSE: true}
      assert.equal false, isJsonResponse(res, body)

    it "will return false if content-type header doesn't exist", ->
      res =
        headers:
          'content-length': 123
      assert.equal false, isJsonResponse(res, body)

    it "will return false if content-type header isn't application/json", ->
      res =
        headers:
          'content-type': 'not-application/json'
      assert.equal false, isJsonResponse(res, body)

    it 'will return false if body is zero length', ->
      body = ''
      assert.equal false, isJsonResponse(res, body)
