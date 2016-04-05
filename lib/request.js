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

var Bluebird = require('bluebird');
var _ = require('lodash');

var StatusCodeError = require('./errors').StatusCodeError;
var resProperties = require('./response');

function _callJSON(res) {
  return res.json();
}

function _callRawBody(res) {
  return res.rawBody();
}

var reqProperties = {
  json: {
    value: function json() {
      return this.then(_callJSON);
    },
  },

  rawBody: {
    value: function rawBody() {
      return this.then(_callRawBody);
    },
  },
};

function request_(options, resolve, reject) {
  var hostname = options.hostname;
  var setHost = options.setHost;
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
    return code >= options.minStatusCode && code <= options.maxStatusCode;
  }

  function generateStatusCodeError() {
    var error = StatusCodeError.create(
      res_.statusCode, options.minStatusCode, options.maxStatusCode,
      res_.headers);
    res_._errorBody()
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
    res_.on('error', failAndAbort);

    if (!isAcceptableStatus(res.statusCode)) {
      generateStatusCodeError();
    } else {
      resolve(res_);
    }
  }

  function onResponseTimedOut() {
    var error = new Error('Fetching from ' + hostname + ' timed out');
    error.code = 'ETIMEDOUT';
    error.timeout = options.timeout;
    error.timing = timing;
    emitError(error);
  }

  function onConnectTimedOut() {
    var error = new Error('Connection to ' + hostname + ' timed out');
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
      req.setHeader('Host', hostname);
    }

    var body = options.body;

    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      req.end(body);
    } else if (body && typeof body.pipe === 'function') {
      body.pipe(req);
    } else {
      req.end();
    }
  }

  var agent = options.agent;
  _.assign(agent.options, {
    // http:
    keepAlive: options.keepAlive,
    // https:
    pfx: options.pfx,
    key: options.key,
    passphrase: options.passphrase,
    cert: options.cert,
    ca: options.ca,
    ciphers: options.ciphers,
    rejectUnauthorized: options.rejectUnauthorized,
    secureProtocol: options.secureProtocol,
  });
  _.assign(agent, {
    maxSockets: options.maxSockets,
    keepAliveMsecs: options.keepAliveMsecs,
    keepAlive: options.keepAlive,
    maxFreeSockets: options.maxFreeSockets,
  });

  var protocolLib = options.protocol === 'https:' ? https : http;
  onRequest(protocolLib.request(options));
}

function request(options) {
  var result = new Bluebird(request_.bind(null, options));
  return Object.defineProperties(result, reqProperties);
}
module.exports = request;
