/*
 * Copyright (c) 2014, Groupon, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * Neither the name of GROUPON nor the names of its contributors may be
 * used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';

var http = require('http');
var https = require('https');
var formatUrl = require('url').format;

var Bluebird = require('bluebird');

var StatusCodeError = require('./errors').StatusCodeError;
var resProperties = require('./response');

function _callJSON(res) {
  return res.json();
}

function _callText(res) {
  return res.text();
}

function _callRawBody(res) {
  return res.rawBody();
}

function parseErrorBody(rawBody) {
  var source = rawBody.toString();
  try {
    return JSON.parse(source);
  } catch (anyError) {
    return source;
  }
}

function noop() {}

var reqProperties = {
  json: {
    value: function json() {
      return this.then(_callJSON);
    },
  },

  text: {
    value: function text() {
      return this.then(_callText);
    },
  },

  rawBody: {
    value: function rawBody() {
      return this.then(_callRawBody);
    },
  },
};

function buildFullUrl(options) {
  var pathParts = options.path.split('?');
  return formatUrl({
    protocol: options.protocol,
    hostname: options.hostname,
    port: options.port,
    pathname: pathParts[0],
    search: pathParts[1],
  });
}

function request_(options, resolve, reject) {
  var host = options.host;
  var setHost = options.setHost;
  var fullUrl = buildFullUrl(options);
  options.setHost = false;

  var req_ = null;
  var res_ = null;
  var connectTimer = null;
  var responseTimer = null;

  var startTime = Date.now();
  var timing = {
    socket: null,
    connect: null,
    headers: null,
  };

  function failAndAbort(error) {
    clearTimeout(connectTimer);
    connectTimer = null;
    clearTimeout(responseTimer);
    responseTimer = null;

    if (req_ !== null) {
      req_.abort();
      req_ = null;
    }
    reject(error);
  }

  function emitError(error) {
    if (res_) {
      res_.emit('error', error);
    } else {
      req_.emit('error', error);
    }
  }

  function isAcceptableStatus(code) {
    var min = options.minStatusCode;
    var max = options.maxStatusCode;
    return (min === false || code >= min) &&
           (max === false || code <= max);
  }

  function generateStatusCodeError() {
    var error = StatusCodeError.create(
      res_.statusCode, options.minStatusCode, options.maxStatusCode,
      res_.headers, options.method, fullUrl);
    res_.rawBody()
      .then(parseErrorBody)
      .then(null, noop)
      .then(function rejectWithBody(body) {
        error.body = body;
        emitError(error);
      });
  }

  function handleResponse(res) {
    clearTimeout(responseTimer);
    responseTimer = null;

    timing.headers = Date.now() - startTime;

    res_ = Object.defineProperties(res, resProperties);
    res_.url = fullUrl;
    res_.on('error', failAndAbort);

    if (!isAcceptableStatus(res.statusCode)) {
      generateStatusCodeError();
    } else {
      resolve(res_);
    }
  }

  function onResponseTimedOut() {
    var error = new Error('Fetching from ' + host + ' timed out');
    error.code = 'ETIMEDOUT';
    error.timeout = options.timeout;
    error.timing = timing;
    emitError(error);
  }

  function onConnectTimedOut() {
    var error = new Error('Connection to ' + host + ' timed out');
    error.code = 'ECONNECTTIMEDOUT';
    error.connectTimeout = options.connectTimeout;
    error.timing = timing;
    emitError(error);
  }

  function onConnect() {
    timing.connect = Date.now() - startTime;
    clearTimeout(connectTimer);
    connectTimer = null;
  }

  function onSocket(socket) {
    timing.socket = Date.now() - startTime;
    connectTimer = setTimeout(onConnectTimedOut, options.connectTimeout);
    socket.once('connect', onConnect);

    responseTimer = setTimeout(onResponseTimedOut, options.timeout);
    socket.setTimeout(options.timeout, onResponseTimedOut);
  }

  function onRequest(req) {
    req_ = req;

    req.once('response', handleResponse);
    req.on('error', failAndAbort);
    req.once('socket', onSocket);

    if (setHost !== false && !req.getHeader('Host')) {
      req.setHeader('Host', host);
    }

    var body = options.body;

    if (typeof body === 'string') {
      req.setHeader('Content-Length', '' + Buffer.byteLength(body));
      req.end(body);
    } else if (Buffer.isBuffer(body)) {
      req.setHeader('Content-Length', '' + body.length);
      req.end(body);
    } else if (body && typeof body.pipe === 'function') {
      body.pipe(req);
    } else {
      req.end();
    }
  }

  var protocolLib = options.protocol === 'https:' ? https : http;
  onRequest(protocolLib.request(options));
}

function request(options) {
  var result = new Bluebird(request_.bind(null, options));
  return Object.defineProperties(result, reqProperties);
}
module.exports = request;
