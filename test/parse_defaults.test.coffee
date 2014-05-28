'use strict'

assert = require 'assertive'
{cloneDeep} = require 'lodash'

{parseDefaults} = require '../lib/helpers'

describe 'parseDefaults', ->
  'use strict'

  config =
    myApi:
      timeout: 1000
      endpointDefaults:
        foo:
          timeout: 21
    globalDefaults:
      timeout: 100
      connectTimeout: 10

  originalConfig = cloneDeep config

  afterEach ->
    # ensure the config wasn't mutated
    assert.deepEqual originalConfig, config

  beforeEach ->
    {@defaults, @endpointDefaults} = parseDefaults config, 'myApi'

  describe 'global defaults', ->
    it 'are added to defaults', ->
      assert.equal 10, @defaults.connectTimeout

  describe 'api-specific defaults', ->
    it 'override global defaults', ->
      assert.equal 1000, @defaults.timeout

  describe 'endpoint-specific defaults', ->
    it 'are collected separately', ->
      assert.equal undefined, @defaults.endpointDefaults
      assert.equal 21, @endpointDefaults.foo.timeout
