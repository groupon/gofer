http = require 'http'
express = require 'express'

module.exports = () ->
  app = buildApp()
  server = http.createServer app
  {server, app}

buildApp = ->
  app = express()

  app.all "/error", (req, res, next) ->
    res.status 500
    res.end 'error'

  app.post "*", (req, res, next) ->
    res.status 201
    res.end 'created'

  generateResponse = (req, res) ->
    res.writeHead req.query.__status || 200

    if req.query.__delay
      # send 4096 bytes and flush the buffer
      res.write Array(4096+1).join "a"
      setTimeout (->
        res.end "ok"
      ), req.query.__delay

    else if req.query.__chunkDelay && req.query.__totalDelay
      writeChunk = ->
        res.write Array(4096+1).join 'a'
      writeChunkHandle = setInterval writeChunk, +req.query.__chunkDelay

      finishRes = ->
        clearInterval writeChunkHandle
        res.end 'ok'

      setTimeout finishRes, +req.query.__totalDelay

    else
      res.end "ok"

  app.all "*", (req, res, next) ->
    if req.query.__latency
      setTimeout (->
        generateResponse(req, res)
      ), req.query.__latency
    else
      generateResponse(req, res)
