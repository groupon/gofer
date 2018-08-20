'use strict';

const fs = require('fs');
const http = require('http');

const browserify = require('browserify');

const BASE_HTML = `${__dirname}/base.html`;

function onRequest(req, res) {
  if (req.url === '/favicon.ico') {
    return res.end('ok');
  }

  if (req.url.indexOf('/echo') === 0) {
    res.setHeader('Content-Type', 'application/json; charset=utf8');
    return res.end(
      JSON.stringify({
        method: req.method,
        headers: req.headers,
        url: req.url,
      })
    );
  }

  function fail(error) {
    res.end(error.stack);
  }

  function onBundle(error, bundle) {
    if (error) {
      return fail(error);
    }
    const htmlTpl = fs.readFileSync(BASE_HTML, 'utf8');
    const html = `${htmlTpl}<script>${bundle}</script>`;
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  }

  browserify({
    entries: [__dirname],
  }).bundle(onBundle);
}

function onListen() {
  process.stdout.write('Listening on http://127.0.0.1:3000\n');
}

http.createServer(onRequest).listen(3000, onListen);
