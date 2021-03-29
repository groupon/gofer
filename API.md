# `gofer` - API

The module has two exports:

* [`fetch`](#fetchurl-options-callback), a function for fetching HTTP resources.
* [`Gofer`](#gofer), a base class for service clients.

## `fetch(url, options, callback)`

```js
const { fetch } = require('gofer');
```

### Options

* `method`: The HTTP verb, e.g. 'GET' or 'POST'.
* `headers`: A plain object with header names and values. E.g.
    `{'content-type': 'text/x-cats'}`.
* `auth`: Either a string of the form `username:password` or an object with
    `username` and `password` properties that will be used to generate a
    [basic authorizationheader][basicauth].
* `baseUrl`: Prefix for the `url` parameter.
    `fetch('/echo', { baseUrl: 'https://my-api.com/v2' })` will load
    https://my-api.com/v2/echo.
* `pathParams`: Values for placeholders in the url path. E.g. `{ foo: 'bar' }`
    will replace all occurrences of `{foo}` in the url path with `'bar'`.
* `qs`: Additional query parameters that will be combined with those present
    in the initial path/url arg.  If `qs` is a plain JS object, the contents
    will be recursively serialized using an algorithm similar to that of the
    [`qs` library](https://www.npmjs.com/package/qs).   If it is a JavaScript
    `URLSearchParams` object, each entry in it will be `.append()`ed to any
    existing query parameters.
* `body`: Content of the request body, either as a string, a Buffer, or a
    readable stream.
* `json`: Content of the request body to be sent as a JSON encoded value.
* `form`: Content of the request body to be sent using `x-www-form-urlencoded`.
    The serialization is the same as that used by the `qs` option.
* All [TLS socket options][tls] for https requests.
* `maxSockets`: Maximum number of parallel requests to the same domain. `gofer`
    will never use the global http(s) agent but will instead keep agents per
    client class.
* `timeout`: Response- and socket read timeout in milliseconds (default: 10000)
    1. if the socket is idle for more than this time, there will be an
        ESOCKETTIMEDOUT (NodeJS only)
    2. if it takes longer to receive response headers (measured from when the
        request function is first called), there will be an ETIMEDOUT
* `connectTimeout`: Timeout in milliseconds for the time between acquiring a
    socket and establishing a connection to the remote host. This should
    generally be relatively low. (default: 1000) (NodeJS only)
* `completionTimeout`: Timeout in milliseconds between when the response headers
    have been received, and when the final byte of the response body has been
    received.  (no default; disabled by default) (NodeJS only)
* `searchDomain`: Inspired by the `search` setting in `/etc/resolv.conf`.
    Append this to any hostname that doesn't already end in a ".".
    E.g. `my-hostname` turns into `my-hostname.<searchDomain>.` but
    `my.fully.qualified.name.` won't be touched.
* `keepAlive`: if set to `true`, enables HTTP keep-alive
  ⚠ Enabling `keepAlive` can lead to `MaxListenersExceededWarning: Possible EventEmitter memory leak detected.` warnings.
* `captureAsyncStack`: Extends error trace with stack trace before call. (Default: `false`) **Capturing the stack is expensive! Set only for debugging purposes**

[basicauth]: https://en.wikipedia.org/wiki/Basic_access_authentication
[tls]: https://nodejs.org/api/tls.html#tls_new_tls_tlssocket_socket_options

### Return/callback value

`fetch()` returns a Promise for, or calls the callback specified with a
response object, which supports the following methods.  For convenience
in Promise mode, you may also invoke each of them directly on the Promise
returned from `fetch()`, i.e. you may do:

```js
fetch(url).then(res => res.json()).then(obj => console.log(obj.status));
// OR
fetch(url).json().then(obj => console.log(obj.status));
```

#### `.json() => Promise<Object>`

Returns a Promise for the entire response text, parsed as JSON

#### `.text() => Promise<string>`

Returns a Promise for the entire response, charset decoded

#### `.rawBody() => Promise<buffer>`

Returns a Promise for the raw response body, as a Buffer

#### `.stream() => ReadableStream`

Returns a stream for the data as it arrives

## `Gofer`

This class can be used directly, but it's mainly meant to be the base class for individual service clients.
Example:

```js
const Gofer = require('gofer');
const { version, name } = require('./package.json');

class MyClient extends Gofer {
  constructor(config) {
    super(config, 'myService', version, name);
  }

  /* endpoint definitions here */
}
```

### `new Gofer(config, serviceName, clientVersion, clientName)`

#### Configuration

All parts of the configuration are just [default options](#options).
There are three levels of configuration:

* `config.globalDefaults`: Applies for calls to all services.
* `config[serviceName]`: Only applies to calls to one specific service.
* `config[serviceName].endpointDefaults[endpointName]`: Only applies to calls
    using a specific endpoint.

More specific configuration wins, e.g. an endpoint-level default takes
precendence over a service-level default.

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
  x() {
    return this.get('/something', { endpointName: 'x' });
  }
}

const a = new GoferA(config), b = new GoferB(config);
a.fetch('/something'); // will use timeout: 1001, connectTimeout: 55
b.fetch('/something'); // will use timeout: 99, connectTimeout: 70
b.x(); // will use timeout: 23, connectTimeout: 70
```

#### Option mappers

All service-specific behavior is implemented using option mappers.
Whenever an request is made, either via an endpoint or directly via
`gofer.fetch`, the options go through the following steps:

1. The endpoint defaults are applied if the request was made through an
    endpoint.
3. `options.serviceName` and `options.serviceVersion` is added.
4. `options.methodName` and `options.endpointName` is added. The former
    defaults to the http verb but can be set to a custom value (e.g.
    `addFriend`). The latter is only set if the request was made through an
    endpoint method.
5. The service-specific and global defaults are applied.
6. For every registered option mapper `m` the `options` are set to
    `m(options) || options`.
7. A `User-Agent` header is added if not present already.
8. `null` and `undefined` values are removed from `qs` and `headers`. If you
    want to pass empty values, you should use an empty string.

Step 6 implies that every option mapper is a function that takes one argument
`options` and returns transformed options or a falsy value. Inside of the
mapper `this` refers to the `gofer` instance. The example contains an option
mapper that handles access tokens and a default base url.

### Methods modifying the prototype

#### `Gofer.prototype.addOptionMapper(mapFn)`

Add a new option mapper to *all* instances using the prototype.
This can also be called on an instance which doesn't have a global effect.

* `mapFn`: An option mapper, see [option mappers](#option-mappers)

#### `Client.prototype.registerEndpoints`

Registers "endpoints".
Endpoints are convenience methods for easier construction of API calls
and can also improve logging/tracing.
The following conditions are to be met by `endpointMap`:

1. It maps a string identifier that is a valid property name to a function.
2. The function takes one argument which is `fetch`.
3. `fetch` works like `gofer.fetch` only that it's aware of
    [endpoint defaults](#configuration).

Whatever the function returns will be available as a property on instances of
the class. Common variants are a function or a nested objects with functions.

```js
MyService.prototype.registerEndpoints({
  simple(fetch) {
    return cb => fetch('/some-path', cb);
  },
  complex(fetch) {
    return {
      foo(qs, cb) {
        return fetch('/foo', { qs: qs }, cb);
      },
      bar(entity, cb) {
        return fetch('/bar', { json: entity, method: 'PUT' }, cb);
      }
    }
  }
});
const my = new MyService();
my.simple(); // returns a Promise
my.complex.foo({ limit: 1 }); // returns a Promise
my.complex.bar({ name: 'Jordan', friends: 231 }, (err, body) => {});
```

### Instance methods

#### `gofer.clone()`

Creates a new instance with the exact same settings and referring to the same
`hub`.

#### `gofer.with(overrideConfig)`

Returns a copy with `overrideConfig` merged
into both the endpoint- and the service-level defaults.
Useful if you know that you'll need custom timeouts for this one call
or you want to add an accessToken.

#### gofer.fetch(url: String, options, cb)

* `url`: The url to fetch. May be relative to `options.baseUrl`.
* `options`: Anything listed below under [options](#options)
* `cb`: A callback function that receives the following arguments:
  - `error`: An instance of `Error` or `undefined`/`null`.
  - `body`: The (generally parsed) response body.
  - `response`: The response object with headers and statusCode.

Unless a `cb` is provided, the function will return a `Promise`.
If a `cb` is provided, it will return `undefined.`

If an HTTP status code outside of the accepted range is returned,
the error will be a `StatusCodeError` with the following properties:

* `method`: The request method.
* `url`: The full URL that was requested.
* `headers`: The headers of the response.
* `body`: The, in most cases parsed, response body.
* `statusCode`: The actual HTTP status code.
* `minStatusCode`: The lower bound of accepted status codes.
* `maxStatusCode`: The upper bound of accepted status codes.

The accepted range of status codes is part of the
[configuration](#configuration). It defaults to accepting 2xx codes only.

If there's an error that prevents any response from being returned,
you can look for `code` to find out what happened. Possible values include:

* `ECONNECTTIMEDOUT`: It took longer than `options.connectTimeout` allowed to
    establish a connection.
* `ETIMEDOUT`: Request took longer than `options.timeout` allowed.
* `ESOCKETTIMEDOUT`: Same as `ETIMEDOUT` but signifies that headers were
    received.
* `EPIPE`: Writing to the request failed.
* `ECONNREFUSED`: The remote host refused the connection, e.g. because nothing
    was listening on the port.
* `ENOTFOUND`: The hostname failed to resolve.
* `ECONNRESET`: The remote host dropped the connection. E.g. you are talking
    to another node based service and a process died.

### Instance properties

#### `gofer.defaults`

### Option mappers
