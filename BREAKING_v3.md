# Gofer v3

The biggest change in 3.x is that `gofer` no longer uses `request` behind the scenes.
Also we're trying to align the interface more closely with [`fetch`](https://github.com/github/fetch).
Whenever we return a promise, it will be `Bluebird`-flavored.

Simple `fetch`-style usage:

```js
myClient.issues.show('132')
  .then(res => res.json())
  .then(data => console.log(data));
```

Convenience methods for validating status codes & parsing the response body:

```js
myClient.issues.show('132')
  .json() // or .text() / .body([encoding])
  .then(data => console.log(data));
```

**Note:** Methods like `.json()` do not exist on `Promise<Response>` in `fetch`. It's specific to `gofer`'s more high-level API.

Catching specific errors:

```js
myClient.issues.show('132')
  .json()
  .then(data => console.log(data))
  .catch(NotFoundError, error => console.error('Issue not found!'));
```

## Breaking Changes

### Fewer `fetch` Signatures

There will be only 3 signatures for `fetch`.
Optional parameters resolve strictly left-to-right:

* `fetch(url)`
* `fetch(url, options)`
* `fetch(url, options, callback)`

Endpoint definitions for 2.x:

```js
MyClient.prototype.registerEndpoints({
  issues(fetch) {
    return {
      all(callback) {
        return fetch('/issues', callback);
      },
      show(id, callback) {
        return fetch('/issues/{id}', {
          pathParams: { id },
        }, callback);
      },
      remove(id, callback) {
        return fetch({
          method: 'DELETE',
          uri: '/issues/{id}',
          pathParams: { id },
        }, callback);
      },
    };
  },
});
```

Compatible with 2.x and 3.x:

```js
MyClient.prototype.registerEndpoints({
  issues(fetch) {
    return {
      all(callback) {
        // `callback` is only valid as the 3rd parameter
        // This allows us to easily intercept `fetch` calls that involve a callback.
        return fetch('/issues', {}, callback);
      },
      show(id, callback) {
        return fetch('/issues/{id}', {
          pathParams: { id },
        }, callback);
      },
      remove(id, callback) {
        // URL can only be passed as the first argument, not as part of the options
        return fetch('/issues/{id}', {
          method: 'DELETE',
          pathParams: { id },
        }, callback);
      },
    };
  },
});
```

Dropping support for callbacks (optional):

```js
MyClient.prototype.registerEndpoints({
  issues(fetch) {
    return {
      all() {
        return fetch('/issues');
      },
      show(id) {
        return fetch('/issues/{id}', {
          pathParams: { id },
        });
      },
      remove(id) {
        return fetch('/issues/{id}', {
          method: 'DELETE',
          pathParams: { id },
        });
      },
    };
  },
});
```

### `fetch : Promise<Response>`

`fetch` will no longer return a duplex stream but a `Promise`.
Any `body` needs to be passed in as an option.
Support for `stuff.pipe(fetch())` and `fetch().pipe(sink)` will be dropped.
Neither of those two has seen any serious use in practice.
And where it *was* used it tended to lead to bad error handling because of the way errors propagate in node streams.

If a `callback` is provided,
`fetch` will switch into legacy mode and return `undefined`.

### `baseUrl`'s Query Params Are Ignored

Previously `baseUrl: 'http://foo.bar/v2?x=2'` would set a default query parameter.
This feature will be removed since `defaults.qs` already covers this use case.
When a `baseUrl` with query string is passed in, it will be treated as an error.

### `baseUrl` is now an option and `clearOptionMappers` is gone

There's no default option mapper anymore. `baseUrl` is now just an option like any other.
Which means libraries can get rid of their `clearOptionMappers` calls.

### Fewer `callback` Arguments

The callback signature changes to `callback(error, body, response)`.
`response` has no `body` property, it's just node's HTTP response object.

### Remove `hub`

Instrumenting HTTP calls will be decoupled from the actual client.

### `serviceVersion` becomes `clientVersion`

This fixes one of the more confusing naming choices in Gofer v2.
Previously:

* `serviceName`: Name of the config section used by this client, also reported in the `User-Agent` as the type of client.
* `serviceVersion`: Version of the client library, generally expected to match `package.json#version`.

Now:

* `serviceName`: Name of the service being talked to, determines the name of the config section used by this client.
* `clientName`: Name of the client library, generally expected to match `package.json#name`. Appears in the `User-Agent`.
* `clientVersion`: Version of the client library, generally expected to match `package.json#version`. Appears in the `User-Agent`.

## Supported Options

* `method`: Uppercase HTTP method, defaults to `GET`.
* `baseUrl`: URL defaults for protocol, host, port, and pathname.
* `qs`: Additional query string parameters to be added to the url.
* `body`: A string, buffer, or stream to be used as the request body.
* `form`: A value to be sent as a urlencoded request body.
* `json`: A value to be sent as a JSON-encoded request body.
* `auth`: An object with `user`/`password` properties to be used as Basic auth header or a string of the format `user:password`.
* `connectTimeout`: How long to wait for a successful TCP connection after acquiring a socket.
* `timeout`: How long to wait for response headers. Also controls the socket read timeout.
* `pathParams`: Object with params that will be inserted into `{placeholder}`s in the URL.
* `maxSockets`: How many connections/sockets in parallel are allowed.
* `rejectUnauthorized`: Same as [node's own `rejectUnauthorized`](https://nodejs.org/api/tls.html#tls_new_tls_tlssocket_socket_options).
* `headers`: Works just like node's own `headers` option.
