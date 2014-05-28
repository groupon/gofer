
assert = require 'assertive'

{resolveOptional} = require '../lib/helpers'

DEFAULT_CB = ->
DEFAULT_URI = '/uri'

describe 'resolveOptional', ->
  it 'can handle optional options', ->
    {options, cb} = resolveOptional DEFAULT_URI, DEFAULT_CB
    assert.equal DEFAULT_URI, options.uri
    assert.equal DEFAULT_CB, cb

  it 'can handle optional path', ->
    {options, cb} = resolveOptional { uri: DEFAULT_URI }, DEFAULT_CB
    assert.equal DEFAULT_URI, options.uri
    assert.equal DEFAULT_CB, cb

  it 'works correctly without callback', ->
    {options, cb} = resolveOptional { uri: DEFAULT_URI }
    assert.equal DEFAULT_URI, options.uri
    assert.hasType Function, cb
