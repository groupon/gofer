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
var debug = require('debug')('gofer');

var StatusCodeError = require('./errors').StatusCodeError;
var resProperties = require('./response');

function noop() {}

function clearImmediateSafe(handle) {
  // See: https://github.com/nodejs/node/pull/9759
  if (!handle) return;
  clearImmediate(handle);
  // eslint-disable-next-line no-underscore-dangle
  handle._onImmediate = noop;
}

function setIOTimeout(callback, ms) {
  var initialHandle = null;
  var delayHandle = null;
  var done = false;
  function onDelay() {
    if (done) return;
    done = true;
    delayHandle = null;
    callback();
  }
  function onTimer() {
    if (done) return;
    initialHandle = null;
    delayHandle = setImmediate(onDelay);
  }
  function cancel() {
    if (done) return;
    done = true;
    clearTimeout(initialHandle);
    clearImmediateSafe(delayHandle);
    initialHandle = delayHandle = null;
    return;
  }
  initialHandle = setTimeout(onTimer, ms);
  return cancel;
}

function clearIOTimeout(handle) {
  if (!handle) {
    return undefined;
  }
  return handle();
}

function callJSON(res) {
  return res.json();
}

function callText(res) {
  return res.text();
}

function callRawBody(res) {
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

var reqProperties = {
  json: {
    value: function json() {
      return this.then(callJSON);
    },
  },

  text: {
    value: function text() {
      return this.then(callText);
    },
  },

  rawBody: {
    value: function rawBody() {
      return this.then(callRawBody);
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

function requestFunc(options, resolve, reject) {
  var host = options.host;
  var setHost = options.setHost;
  var fullUrl = buildFullUrl(options);
  options.setHost = false;
  debug('-> %s %s', options.method, fullUrl);

  var reqObj = null;
  var resObj = null;
  var connectTimer = null;
  var responseTimer = null;
  var completionTimer = null;
  var socketTimer = null;

  var startTime = Date.now();
  var timing = {
    socket: null,
    connect: null,
    headers: null,
  };

  function clearCompletionTimer() {
    clearIOTimeout(completionTimer);
    completionTimer = null;
  }

  function failAndAbort(error) {
    debug('<- %s %s', error.code || error.statusCode, fullUrl);
    clearIOTimeout(connectTimer);
    connectTimer = null;
    clearIOTimeout(responseTimer);
    responseTimer = null;
    clearCompletionTimer();
    clearImmediateSafe(socketTimer);
    socketTimer = null;

    if (reqObj !== null) {
      reqObj.abort();
      reqObj = null;
    }
    reject(error);
  }

  function emitError(error) {
    if (resObj) {
      resObj.emit('error', error);
    } else if (reqObj) {
      reqObj.emit('error', error);
    }
  }

  function isAcceptableStatus(code) {
    var min = options.minStatusCode;
    var max = options.maxStatusCode;
    return (min === false || code >= min) && (max === false || code <= max);
  }

  function generateStatusCodeError() {
    var error = StatusCodeError.create(
      resObj.statusCode,
      options.minStatusCode,
      options.maxStatusCode,
      resObj.headers,
      options.method,
      fullUrl
    );
    resObj
      .rawBody()
      .then(parseErrorBody)
      .then(null, noop)
      .then(function rejectWithBody(body) {
        error.body = body;
        emitError(error);
      });
  }

  function handleResponse(res) {
    clearIOTimeout(responseTimer);
    responseTimer = null;

    timing.headers = Date.now() - startTime;

    resObj = Object.defineProperties(res, resProperties);
    resObj.url = fullUrl;
    resObj.on('error', failAndAbort);
    resObj.on('end', clearCompletionTimer);

    if (!isAcceptableStatus(res.statusCode)) {
      generateStatusCodeError();
    } else {
      debug('<- %s %s', res.statusCode, fullUrl);
      resolve(resObj);
    }
  }

  function isConnecting() {
    return !!(reqObj && reqObj.socket && reqObj.socket.readable === false);
  }

  function onCompletionTimedOut() {
    var error = new Error('Request to ' + host + ' timed out');
    error.code = 'ETIMEDOUT';
    error.timeout = options.completionTimeout;
    error.timing = timing;
    error.connect = isConnecting();
    error.completion = true;
    emitError(error);
  }

  function onResponseTimedOut(code) {
    var error = new Error('Fetching from ' + host + ' timed out');
    error.code = code || 'ETIMEDOUT';
    error.timeout = options.timeout;
    error.timing = timing;
    error.connect = isConnecting();
    emitError(error);
  }

  function onConnectTimedOut() {
    var error = new Error('Connection to ' + host + ' timed out');
    error.code = 'ECONNECTTIMEDOUT';
    error.connectTimeout = options.connectTimeout;
    error.timing = timing;
    error.connect = true;
    emitError(error);
  }

  function onConnect() {
    timing.connect = Date.now() - startTime;
    clearIOTimeout(connectTimer);
    connectTimer = null;
  }

  function onSocketTimedOut() {
    socketTimer = setImmediate(function checkRealTimeout() {
      socketTimer = null;
      if (reqObj && reqObj.socket && reqObj.socket.readable) {
        onResponseTimedOut('ESOCKETTIMEDOUT');
      }
    });
  }

  function onSocket(socket) {
    timing.socket = Date.now() - startTime;

    if (socket._connecting || socket.connecting) {
      connectTimer = setIOTimeout(onConnectTimedOut, options.connectTimeout);
      socket.once('connect', onConnect);
    }

    responseTimer = setIOTimeout(onResponseTimedOut, options.timeout);
  }

  function onRequest(req) {
    reqObj = req;

    if (options.completionTimeout > 0) {
      completionTimer = setIOTimeout(
        onCompletionTimedOut,
        options.completionTimeout
      );
    }

    req.setTimeout(options.timeout, onSocketTimedOut);

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
  var result = new Bluebird(requestFunc.bind(null, options));
  return Object.defineProperties(result, reqProperties);
}
module.exports = request;
