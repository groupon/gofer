'use strict';
var http = require('http');
var parseUrl = require('url').parse;

var options = require('./mock-service.browser');

var MOCK_SERVICE_PORT = +(options.baseUrl.match(/:(\d+)/)[1]);

var server;

function sendEcho(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    method: req.method,
    url: req.url,
    headers: req.headers,
  }));
}

function send404(req, res) {
  res.statusCode = 404;
  sendEcho(req, res);
}

function handleRequest(req, res) {
  var pathname = parseUrl(req.url).pathname;
  switch (pathname) {
    case '/echo':
      return sendEcho(req, res);

    case '/json/404':
      return send404(req, res);

    default:
      return res.end('ok');
  }
}

before(function (done) {
  server = http.createServer(handleRequest);
  server.on('error', done);
  server.listen(MOCK_SERVICE_PORT, function () {
    done();
  });
});

after(function () {
  if (server) {
    try {
      server.close();
    } catch (e) {
      // Ignore cleanup error
    }
  }
});

module.exports = options;
