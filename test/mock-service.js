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
  // A random header that happens to be a "simple response header".
  // See: https://www.w3.org/TR/cors/#simple-response-header
  res.setHeader('Content-Language', 'has%20stuff');
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  }

  var pathname = parseUrl(req.url).pathname;
  if (/^\/echo/.test(pathname)) {
    return sendEcho(req, res);
  }

  switch (pathname) {
    case '/json/404':
      return send404(req, res);

    default:
      return res.end('ok');
  }
}

if (typeof before === 'function') {
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
}
if (process.mainModule === module) {
  server = http.createServer(handleRequest);
  server.listen(MOCK_SERVICE_PORT, function () {
    /* eslint no-console: 0 */
    console.log('Listening on %s\n', options.baseUrl);
  });
}

module.exports = options;
