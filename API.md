# `gofer` - API

The module has two exports:

* [`fetch`](#fetchurl-options-callback), a function for fetching HTTP resources.
* [`Gofer`](#gofer), a base class for service clients.

## `fetch(url, options, callback)`

```js
var fetch = require('gofer').fetch;
// Or using module imports:
import { fetch } from 'gofer';
```

### Options

* `method`: The HTTP verb, e.g. 'GET' or 'POST'.
* `headers`: A plain object with header names and values. E.g. `{'content-type': 'text/x-cats'}`.
* `auth`: Either a string of the form `username:password` or an object with `username` and `password` properties that will be used to generate a [basic authorization header](https://en.wikipedia.org/wiki/Basic_access_authentication).
* `baseUrl`: Prefix for the `url` parameter. `fetch('/echo', { baseUrl: 'https://my-api.com/v2' })` will load https://my-api.com/v2/echo.
* `pathParams`: Values for placeholders in the url path. E.g. `{ foo: 'bar' }` will replace all occurrences of `{foo}` in the url path with `'bar'`.
* `qs`: Additional query parameters that will be serialized using the [`qs` library](https://www.npmjs.com/package/qs).
* `body`: Content of the request body, either as a string, a Buffer, or a readable stream.
* `json`: Content of the request body to be sent as a JSON encoded value.
* `form`: Content of the request body to be sent using `x-www-form-urlencoded`. The serialization is handled by the [`qs` library](https://www.npmjs.com/package/qs).
* All [TLS socket options](https://nodejs.org/api/tls.html#tls_new_tls_tlssocket_socket_options) for https requests.
* `maxSockets`: Maximum number of parallel requests to the same domain. `gofer` will never use the global http(s) agent but will instead keep agents per client class.
* `timeout`: Response- and socket read timeout in milliseconds.
* `connectTimeout`: Timeout in milliseconds for the time between acquiring a socket and establishing a connection to the remote host. This should generally be relatively low.

## `Gofer`

This class can be used directly
but it's mainly meant to be the base class for individual service clients.
Example:

```js
var util = require('util');
var Gofer = require('gofer');
var pkg = require('./package.json');

function MyClient() {
  Gofer.apply(this, config, 'myService', pkg.version, pkg.name);
}
util.inherits(MyClient, Gofer);
```

Using `class` syntax:

```js
import Gofer from 'gofer';
import { name, version } from './package.json';

class MyClient extends Gofer {
  constructor(config) {
    super(config, 'myService', version, name);
  }
}
```

### `new Gofer(config, serviceName, clientVersion, clientName)`

#### Configuration

All parts of the configuration are just [default options](#options).
There are three levels of configuration:

* `config.globalDefaults`: Applies for calls to all services.
* `config[serviceName]`: Only applies to calls to one specific service.
* `config[serviceName].endpointDefaults[endpointName]`: Only applies to calls using a specific endpoint.

More specific configuration wins,
e.g. an endpoint-level default takes precendence over a service-level default.
Example:

```js
const Gofer = require('gofer');

const config = {
  globalDefaults: { timeout: 100, connectTimeout: 55 },
  a: { timeout: 1001 },
  b: {
    timeout: 99,
    connectTimeout: 70,
    endpointDefaults: { x: { timeout: 23 } },
  },
};

class GoferA extends Gofer {
  constructor(config) { super(config, 'a'); }
}

class GoferB extends Gofer {
  constructor(config) { super(config, 'b'); }
}

GoferB.prototype.registerEndpoints({
  x: function (fetch) {
    return function (cb) { return fetch('/something', cb); };
  },
});

const a = new GoferA(config), b = new GoferB(config);
a.fetch('/something'); // will use timeout: 1001, connectTimeout: 55
b.fetch('/something'); // will use timeout: 99, connectTimeout: 70
b.x(); // will use timeout: 23, connectTimeout: 70
```

### Methods modifying the prototype

### Instance methods

### Instance properties

#### `gofer.defaults`

### Option mappers
