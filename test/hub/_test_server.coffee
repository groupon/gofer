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

  app.all "*", (req, res, next) ->
    if req.query.__latency
      setTimeout (->
        res.end 'ok'
      ), req.query.__latency
    else if req.query.__status
      res.status req.query.__status
      res.end 'ok'
    else
      res.end 'ok'
