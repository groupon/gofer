'use strict';

/* eslint-env browser */

const Gofer = require('gofer');

const rawResponse = document.createElement('pre');
rawResponse.innerText = '(loading)';
document.body.appendChild(rawResponse);

class EchoClient extends Gofer {
  constructor(config) {
    super(config, 'echo', '0.0.0');
  }

  echo(qs) {
    return this.fetch('/', { qs, endpointName: 'echo' }).json();
  }
}

function onEchoResponse(data) {
  rawResponse.innerText = JSON.stringify(data, null, 2);
}

function onEchoError(error) {
  rawResponse.innerText = `${error.message}\n\n${error.stack}`;
}

const echo = new EchoClient({
  echo: {
    baseUrl: '/echo',
    qs: { fromConfig: 'foo' },
  },
});

echo.echo({ fromCall: 'mergedIn' }).then(onEchoResponse).catch(onEchoError);
