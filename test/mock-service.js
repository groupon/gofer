'use strict';

/* eslint-disable no-underscore-dangle */
/* eslint-env mocha */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const selfSigned = require('self-signed');

const options = require('./mock-service.browser');

const MOCK_SERVICE_PORT = +options.baseUrl.match(/:(\d+)/)[1];
const MOCK_SERVICE_PORT_TLS = +options.baseUrlTls.match(/:(\d+)/)[1];

let server;
let serverTls;

function generateCertOptions() {
  const keypair = selfSigned(
    {
      name: 'localhost',
      city: 'Chicago',
      state: 'Illinois',
      organization: 'Test',
      unit: 'Test',
    },
    {
      alt: ['127.0.0.1', 'http://localhost'],
      expire: 60 * 60 * 1000, // one hour
    }
  );
  return {
    cert: keypair.cert,
    key: keypair.private,
  };
}
const certOptions = generateCertOptions();

function sendEcho(req, res) {
  const chunks = [];
  const query = new URL(`http://localhost${req.url}`).searchParams;

  const latency = query.has('__latency') ? +query.get('__latency') : 0;
  const hang = query.has('__hang') ? +query.get('__hang') : 0;

  function forceFlush() {
    res.write(Array(4096 + 1).join(' '));
  }

  function sendBody() {
    res.end(
      JSON.stringify({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks).toString(),
      })
    );
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

  req.on('data', chunk => {
    chunks.push(chunk);
  });
  req.on('end', () => {
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
  const query = new URL(`http://localhost${req.url}`).searchParams;
  const delay = query.has('__delay') ? +query.get('__delay') : 0;
  const chunkDelay = query.has('__chunkDelay') ? +query.get('__chunkDelay') : 0;
  const totalDelay = query.has('__totalDelay') ? +query.get('__totalDelay') : 0;
  let writeChunkHandle;

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
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, HEAD, OPTIONS, DELETE, PATCH'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-a, x-b'
  );

  // Preflight requests that return a 404 confuse Chrome
  if (req.method === 'OPTIONS') return res.end();

  const pathname = new URL(`http://localhost${req.url}`).pathname;
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
  let serversListening = 0;
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

  after(() => {
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
  bootupServers(error => {
    if (error) throw error;
    /* eslint no-console:0 */
    console.log('Listening on %s', options.baseUrl);
    console.log('HTTPS on %s', options.baseUrlTls);
  });
}

// Exposed for the https test so we can set up a compatible client
options.certOptions = certOptions;
module.exports = options;
