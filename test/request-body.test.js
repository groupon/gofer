/* eslint-disable no-underscore-dangle */

'use strict';

const assert = require('assertive');

const { Gofer } = require('../');

const defaultOptions = require('./mock-service');

describe('fetch: sending a body', () => {
  class EchoClient extends Gofer {
    echo(options) {
      return this.fetch('/echo', options).json();
    }
  }
  const client = new EchoClient().with(defaultOptions);

  it('can send a string', () => {
    return client.echo({ body: 'I💖🍕', method: 'PUT' }).then(echo => {
      assert.equal('PUT', echo.method);
      assert.equal('9', echo.headers['content-length']);
      assert.equal('I💖🍕', echo.body);
    });
  });

  it('can send a Buffer', function() {
    if (typeof document !== 'undefined') {
      return this.skip();
    }
    return client
      .echo({ body: new Buffer('I💖🍕'), method: 'PUT' })
      .then(echo => {
        assert.equal('PUT', echo.method);
        assert.equal('9', echo.headers['content-length']);
        assert.equal('I💖🍕', echo.body);
      });
  });

  it('can send a node ReadableStream', function() {
    if (typeof document !== 'undefined') {
      return this.skip();
    }
    const Readable = require('stream').Readable;

    const stream = new Readable();
    const characters = ['I', '💖', '🍕'];
    stream._read = function _read() {
      setTimeout(() => {
        stream.push(characters.shift() || null);
      }, 5);
    };

    const withStreamBody = {
      baseUrl: defaultOptions.baseUrl,
      method: 'PUT',
      body: stream,
    };
    return client.echo(withStreamBody).then(echo => {
      assert.equal('PUT', echo.method);
      // it should chunk the response
      assert.equal(undefined, echo.headers['content-length']);
      assert.equal('I💖🍕', echo.body);
    });
  });

  it('can send a JSON body', () => {
    const withJsonBody = {
      baseUrl: defaultOptions.baseUrl,
      method: 'PUT',
      json: {
        utf8: 'I💖🍕',
        arr: [3, 4],
      },
    };
    return client.echo(withJsonBody).then(echo => {
      assert.equal(
        'application/json;charset=UTF-8',
        echo.headers['content-type']
      );
      assert.equal('{"utf8":"I💖🍕","arr":[3,4]}', echo.body);
    });
  });

  it('can send a form body', () => {
    const withFormBody = {
      baseUrl: defaultOptions.baseUrl,
      method: 'PUT',
      form: {
        nested: { utf8: 'I💖🍕' },
        arr: [3, 4],
      },
    };
    return client.echo(withFormBody).then(echo => {
      assert.equal(
        'application/x-www-form-urlencoded;charset=UTF-8',
        echo.headers['content-type']
      );
      assert.equal(
        `${encodeURIComponent('nested[utf8]')}=${encodeURIComponent(
          'I💖🍕'
        )}&${encodeURIComponent('arr[0]')}=3&${encodeURIComponent('arr[1]')}=4`,
        echo.body
      );
    });
  });
});
