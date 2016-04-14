'use strict';
require('whatwg-fetch'); // polyfill for fetch, required by gofer
var Gofer = require('gofer');

var rawResponse = document.createElement('pre');
rawResponse.innerText = '(loading)';
document.body.appendChild(rawResponse);

function EchoClient(config) {
  Gofer.call(this, config, 'echo', '0.0.0');
}
EchoClient.prototype = Object.create(Gofer.prototype);

EchoClient.prototype.registerEndpoints({
  echo: function withFetch(fetch) {
    return function getEcho(qs) {
      return fetch('/', { qs: qs }).json();
    };
  },
});

function onEchoResponse(data) {
  rawResponse.innerText = JSON.stringify(data, null, 2);
}

function onEchoError(error) {
  rawResponse.innerText = error.message + '\n\n' + error.stack;
}

var echo = new EchoClient({
  echo: {
    baseUrl: '/echo',
    qs: { fromConfig: 'foo' },
  },
});

echo.echo({ fromCall: 'mergedIn' })
  .then(onEchoResponse)
  .catch(onEchoError);
