'use strict';
// This is using file system APIs, no need to run it in a browser.
if (typeof document !== 'undefined') return;

var fs = require('fs');

var assert = require('assertive');
var FormData = require('form-data');
var assign = require('lodash/assign');

var Gofer = require('../');

var defaultOptions = require('./mock-service');

function appendAll(form, formData) {
  function appendOne(field, value) {
    form.append(field, value);
  }

  for (var key in formData) {
    if (!formData.hasOwnProperty(key)) continue;
    var formValue = formData[key];
    if (Array.isArray(formValue)) {
      formValue.forEach(appendOne.bind(null, key));
    } else {
      appendOne(key, formValue);
    }
  }
}

describe('fetch: multi-part via form-data', function () {
  // This serves as a POC that more "exotic" features can be
  // added via option mappers without requiring support in Gofer.
  var client = new Gofer().with(defaultOptions);
  client.registerEndpoint('echo', function (fetch) {
    return function (options) {
      return fetch('/echo', options).json();
    };
  });
  client.addOptionMapper(function (options) {
    var formData = options.formData;
    if (formData) {
      delete options.formData;
      var form = options.body = new FormData();
      appendAll(form, formData);
      options.headers = options.headers || {};
      assign(options.headers, form.getHeaders());
    }
    return options;
  });

  it('can send a complex form with file uploads', function () {
    var file = fs.createReadStream('test/.eslintrc');
    return client.echo({
      formData: {
        str: 'I💖🍕',
        myFile: file,
      },
      method: 'PUT',
    })
      .then(function (echo) {
        assert.equal('PUT', echo.method);
        assert.match(
          /multipart\/form-data; boundary=/,
          echo.headers['content-type']);
        assert.include(
          'Content-Disposition: form-data; name="myFile"; filename=".eslintrc"',
          echo.body);
        assert.include(
          [
            'Content-Disposition: form-data; name="str"',
            '',
            'I💖🍕',
          ].join('\r\n'),
          echo.body);
      });
  });
});
