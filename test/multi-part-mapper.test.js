'use strict';

// This is using file system APIs, no need to run it in a browser.
if (typeof document !== 'undefined') return;

const fs = require('fs');

const assert = require('assertive');
const FormData = require('form-data');

const Gofer = require('../');

const defaultOptions = require('./mock-service');

function appendAll(form, formData) {
  function appendOne(field, value) {
    form.append(field, value);
  }

  for (const key in formData) {
    if (!formData.hasOwnProperty(key)) continue;
    const formValue = formData[key];
    if (Array.isArray(formValue)) {
      formValue.forEach(appendOne.bind(null, key));
    } else {
      appendOne(key, formValue);
    }
  }
}

describe('fetch: multi-part via form-data', () => {
  // This serves as a POC that more "exotic" features can be
  // added via option mappers without requiring support in Gofer.
  const client = new Gofer().with(defaultOptions);
  client.registerEndpoint('echo', fetch => {
    return function(options) {
      return fetch('/echo', options).json();
    };
  });
  client.addOptionMapper(options => {
    const formData = options.formData;
    if (formData) {
      delete options.formData;
      const form = (options.body = new FormData());
      appendAll(form, formData);
      options.headers = options.headers || {};
      Object.assign(options.headers, form.getHeaders());
    }
    return options;
  });

  it('can send a complex form with file uploads', () => {
    const file = fs.createReadStream('package.json');
    return client
      .echo({
        formData: {
          str: 'I💖🍕',
          myFile: file,
        },
        method: 'PUT',
      })
      .then(echo => {
        assert.equal('PUT', echo.method);
        assert.match(
          /multipart\/form-data; boundary=/,
          echo.headers['content-type']
        );
        assert.include(
          'Content-Disposition: form-data; name="myFile"; filename="package.json"',
          echo.body
        );
        assert.include(
          ['Content-Disposition: form-data; name="str"', '', 'I💖🍕'].join(
            '\r\n'
          ),
          echo.body
        );
      });
  });
});
