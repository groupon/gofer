Promise = require 'bluebird'

{safeParseJSON} = require './json'

@response =
  get: ->
    @_responsePromise ?= new Promise (resolve, reject) =>
      @once 'response', resolve
      @once 'error', reject

@rawBody =
  get: ->
    return @_rawBodyPromise if @_rawBodyPromise?

    buffer = []
    bodyLength = 0
    didEnd = false
    @on 'data', (chunk) ->
      bodyLength += chunk.length
      buffer.push chunk

    @on 'end', -> didEnd = true

    @_rawBodyPromise = new Promise (resolve, reject) =>
      concatAndEmit = ->
        if buffer.length && Buffer.isBuffer buffer[0]
          body = Buffer.concat buffer, bodyLength
          if @encoding?
            body = body.toString @encoding
        else if buffer.length
          body = buffer.join ''
          if @encoding == 'utf8' && body == "\uFEFF"
            body = body.substring 1
        else
          body = ''

        resolve body

      return concatAndEmit() if didEnd
      @on 'end', concatAndEmit

@parsedBody =
  get: ->
    @_parsedBody ?= @rawBody.then (rawBody) ->
      {result, error} = safeParseJSON rawBody.toString 'utf8'
      if error
        Promise.reject error
      else
        result
