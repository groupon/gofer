'use strict';
var fs = require('fs');
var http = require('http');
var https = require('https');
var parseUrl = require('url').parse;

var options = require('./mock-service.browser');

var MOCK_SERVICE_PORT = +(options.baseUrl.match(/:(\d+)/)[1]);
var MOCK_SERVICE_PORT_TLS = +(options.baseUrlTls.match(/:(\d+)/)[1]);

var server;
var serverTls;

function sendEcho(req, res) {
  var chunks = [];
  var query = parseUrl(req.url, true).query;

  var latency = query.__latency ? +query.__latency : 0;
  var hang = query.__hang ? +query.__hang : 0;

  function sendBody() {
    res.end(JSON.stringify({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks).toString(),
    }));
  }

  function sendHeader() {
    res.writeHead(res.statusCode, {
      'Content-Type': 'application/json',
    });
    // See:
    // https://michaelheap.com/force-flush-headers-using-the-http-module-for-nodejs/
    res.socket.write(res._header);
    res._headerSent = true;
    if (hang) {
      setTimeout(sendBody, hang);
    } else {
      sendBody();
    }
  }

  req.on('data', function onChunk(chunk) {
    chunks.push(chunk);
  });
  req.on('end', function onEnd() {
    if (latency) {
      setTimeout(sendHeader, latency);
    } else {
      sendHeader();
    }
  });
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, HEAD, OPTIONS, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

function bootupServers(done) {
  var serversListening = 0;
  function onListen() {
    ++serversListening;
    if (serversListening === 2) done();
  }
  server = http.createServer(handleRequest);
  server.on('error', done);
  server.listen(MOCK_SERVICE_PORT, onListen);
  var certOptions = {
    key: fs.readFileSync('test/certs/server/my-server.key.pem'),
    ca: [fs.readFileSync('test/certs/server/my-root-ca.crt.pem')],
    cert: fs.readFileSync('test/certs/server/my-server.crt.pem'),
  };
  serverTls = https.createServer(certOptions, handleRequest);
  serverTls.on('error', done);
  serverTls.listen(MOCK_SERVICE_PORT_TLS, onListen);
}

if (typeof before === 'function') {
  before(bootupServers);

  after(function () {
    if (server) {
      try {
        server.close();
      } catch (e) {
        // Ignore cleanup error
      }
    }
    if (serverTls) {
      try {
        serverTls.close();
      } catch (e) {
        // Ignore cleanup error
      }
    }
  });
}
if (process.mainModule === module) {
  bootupServers(function (error) {
    if (error) throw error;
    /* eslint no-console:0 */
    console.log('Listening on %s', options.baseUrl);
    console.log('HTTPS on %s', options.baseUrlTls);
  });
}

module.exports = options;
