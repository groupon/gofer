{merge, buildUserAgent} = require '../lib/helpers'
assert = require 'assertive'
_ = require 'lodash'

class Finch
  value: 1
  experiment: ->
    2

describe 'Helpers', ->
  default_headers = finch = undefined

  beforeEach ->
    finch = new Finch()
    default_headers =
      'x-fancy': 'very'

  it 'merge with functions', ->
    data = merge {finch, headers: default_headers}, {something: 3, headers: {accept: '*/*'}}
    assert.equal 3, data.something
    assert.expect data.finch instanceof Finch
    assert.equal 1, data.finch.value
    assert.equal 2, data.finch.experiment()
    assert.equal '*/*', data.headers.accept
    assert.equal 'very', data.headers['x-fancy']

    # dont overwrite the defaults
    assert.equal undefined, default_headers.accept

    # make extra sure we arent modifying the defaults
    data.headers['x-custom'] = 4
    assert.equal undefined, default_headers['x-custom']

  describe "buildUserAgent", ->
    it 'has defaults', ->
      ua = buildUserAgent({})
      assert.equal "[no serviceName]/[no serviceVersion]; [no appName]/[no appSha]; [no fqdn]", ua

    it 'it includes 5 fields', ->
      ua = buildUserAgent
        serviceVersion: '1.0'
        serviceName: 'test-service'
        appName: 'my-app'
        appSha: '12345'
        fqdn: 'my.host'

      assert.equal "test-service/1.0; my-app/12345; my.host", ua

