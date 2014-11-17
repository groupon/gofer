assert = require 'assertive'
hub = require('../../hub')()
serverBuilder = require './_test_server'

clone = (thing) -> JSON.parse JSON.stringify thing

server = app = undefined
describe 'Basic Integration Test', ->
  before (done) ->
    {server} = serverBuilder()
    server.listen 89001, done

  after (done) ->
    server.close done

  describe 'making a request', ->
    it "fires the callback", (done) ->
      hub.fetch {
        uri: "http://localhost:89001"
      },
      (err, body, headers) ->
        assert.falsey err
        assert.equal "ok", body.toString()
        done()
