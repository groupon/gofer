'use strict';

const tls = require('tls');

const assert = require('assertive');
const Bluebird = require('bluebird');

// This is important because PhantomJS has a non-writeable
// error.stack property and the resulting warnings make the tests fail...
Bluebird.config({ warnings: false });

const fetch = require('../').fetch;

const options = require('./mock-service');

describe('fetch: https', () => {
  it('can load from valid https remote', function() {
    // This is a remote call which isn't great but it means we get a valid
    // https certificate without having to pull any tricks.
    this.timeout(2000);
    return fetch('https://api.reddit.com/user/ageitgey/about.json').json();
  });

  it('fails with self-signed https', function() {
    if (typeof document !== 'undefined') {
      // puppeteer ignores self-signed cert errors(?)
      return this.skip();
    }
    return assert.rejects(fetch(options.baseUrlTls)).then(error => {
      // In browsers we don't get any nice, reliable errors (yet?)
      if (typeof document === 'undefined') {
        if (error.code) {
          // more recent node versions (e.g. 4+)
          assert.match(/SELF_SIGNED/, error.code);
        } else {
          // old node versions (e.g. 0.10)
          assert.match(/SELF_SIGNED/, error.message);
        }
      }
    });
  });

  it('supports rejectUnauthorized=false', function() {
    if (typeof document !== 'undefined') {
      // Browsers don't allow to side-step https
      return this.skip();
    }
    return fetch(options.baseUrlTls, {
      rejectUnauthorized: false,
    }).then(res => {
      assert.equal(200, res.statusCode);
    });
  });

  it('can load from self-signed https remote', function() {
    if (typeof document !== 'undefined') {
      // Browsers don't allow to side-step https
      return this.skip();
    }
    return fetch(options.baseUrlTls, {
      ca: [options.certOptions.cert],
    }).then(res => {
      assert.equal(200, res.statusCode);
    });
  });

  it('can load using reusable secureContext', function() {
    if (typeof document !== 'undefined') {
      // Browsers don't allow to side-step https
      return this.skip();
    }
    const secureContext = tls.createSecureContext({
      ca: [options.certOptions.cert],
    });
    return fetch(options.baseUrlTls, {
      secureContext,
    }).then(res => {
      assert.equal(200, res.statusCode);
    });
  });
});
