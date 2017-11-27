'use strict';

var http = require('http');
var https = require('https');
var parseUrl = require('url').parse;

var selfSigned = require('self-signed');

var options = require('./mock-service.browser');

var MOCK_SERVICE_PORT = +(options.baseUrl.match(/:(\d+)/)[1]);
var MOCK_SERVICE_PORT_TLS = +(options.baseUrlTls.match(/:(\d+)/)[1]);

var server;
var serverTls;

function generateCertOptions() {
  var keypair = selfSigned({
    name: 'localhost',
    city: 'Chicago',
    state: 'Illinois',
    organization: 'Test',
    unit: 'Test',
  }, {
    alt: ['127.0.0.1', 'http://localhost'],
    expire: 60 * 60 * 1000, // one hour
  });
  return {
    cert: keypair.cert,
    key: keypair.private,
  };
}
var certOptions = generateCertOptions();

function sendEcho(req, res) {
  var chunks = [];
  var query = parseUrl(req.url, true).query;

  var latency = query.__latency ? +query.__latency : 0;
  var hang = query.__hang ? +query.__hang : 0;

  function forceFlush() {
    res.write(Array(4096 + 1).join(' '));
  }

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
    if (hang) {
      forceFlush();
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

function sendChunks(req, res) {
  var query = parseUrl(req.url, true).query;
  var delay = query.__delay ? +query.__delay : 0;
  var chunkDelay = query.__chunkDelay ? +query.__chunkDelay : 0;
  var totalDelay = query.__totalDelay ? +query.__totalDelay : 0;
  var writeChunkHandle;

  function writeChunk() {
    res.write(Array(4096 + 1).join(' '));
  }

  function finishRes() {
    clearInterval(writeChunkHandle);
    res.end('ok');
  }

  if (delay) {
    writeChunk();
    setTimeout(finishRes, delay);
  } else if (chunkDelay && totalDelay) {
    writeChunkHandle = setInterval(writeChunk, chunkDelay);
    setTimeout(finishRes, totalDelay);
  } else {
    res.end('ok');
  }
}

function handleRequest(req, res) {
  // A random header that happens to be a "simple response header".
  // See: https://www.w3.org/TR/cors/#simple-response-header
  res.setHeader('Content-Language', 'has%20stuff');
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, HEAD, OPTIONS, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-a, x-b');

  // Preflight requests that return a 404 confuse Chrome
  if (req.method === 'OPTIONS') return res.end();

  var pathname = parseUrl(req.url).pathname;
  if (/^\/echo/.test(pathname)) {
    return sendEcho(req, res);
  }

  switch (pathname) {
    case '/json/404':
      return send404(req, res);

    default:
      return sendChunks(req, res);
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
  server.listen(MOCK_SERVICE_PORT, '127.0.0.1', onListen);
  serverTls = https.createServer(certOptions, handleRequest);
  serverTls.on('error', done);
  serverTls.listen(MOCK_SERVICE_PORT_TLS, '127.0.0.1', onListen);
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

// Exposed for the https test so we can set up a compatible client
options.certOptions = certOptions;
module.exports = options;
