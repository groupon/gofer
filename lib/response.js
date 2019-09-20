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

const zlib = require('zlib');

const Bluebird = require('bluebird');

function getStreamForResponse(res) {
  const encoding = (res.headers['content-encoding'] || 'identity')
    .trim()
    .toLowerCase();

  switch (encoding) {
    case 'gzip':
      return res.pipe(zlib.createGunzip());

    case 'identity':
      return res;

    default:
      process.nextTick(() => {
        res.emit('error', new Error(`Unknown content-encoding ${encoding}`));
      });
      return res;
  }
}

function readBody(resolve, reject) {
  const stream = this;
  const chunks = [];

  function addChunk(chunk) {
    chunks.push(chunk);
  }

  function concatChunks() {
    resolve(Buffer.concat(chunks));
  }

  stream.on('data', addChunk);
  stream.on('end', concatChunks);
  stream.on('error', reject);
}

function parseBody(rawBody) {
  const source = rawBody.toString();
  try {
    return JSON.parse(source);
  } catch (syntaxError) {
    syntaxError.source = source;
    this.emit('error', syntaxError);
    throw syntaxError;
  }
}

function toString(rawBody) {
  return rawBody.toString();
}

module.exports = {
  stream: {
    value: function getStream() {
      return getStreamForResponse(this);
    },
  },

  rawBody: {
    value: function rawBody() {
      return new Bluebird(readBody.bind(this.stream()));
    },
  },

  text: {
    value: function text() {
      return new Bluebird(readBody.bind(this.stream())).then(toString);
    },
  },

  json: {
    value: function json() {
      return this.rawBody().then(parseBody.bind(this));
    },
  },
};
