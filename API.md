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
