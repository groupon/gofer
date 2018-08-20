# Gofer v3

The biggest change in 3.x is that `gofer` is now a real class
and no longer encourages "prototype magic" to build clients.
It also drops support for callbacks and switches to native promises.

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

**Note:** Methods like `.json()` do not exist on `Promise<Response>` in `fetch`.
It's specific to `gofer`'s more high-level API.

Catching specific errors:

```js
myClient.issues.show('132')
  .json()
  .then(data => console.log(data))
  .catch(error => {
    if (error instanceof NotFoundError) {
      console.error('Issue not found!');
    } else {
      throw error;
    });
```

## Breaking Changes

### One `fetch` Signature

There is only one signature for `fetch`, with the 2nd argument being optional.

* `fetch(url, options = {})`

### No `.prototype.registerEndpoint(s)`

Endpoint defitions should be done using proper class methods:

```js
class Example extends Gofer {
  constructor(config) {
    super(config, 'example');
  }

  someMethod({ thingId, ...qs }) {
    return this.fetch('/some/{thingId}', {
      methodName: 'someMethod',
      pathParams: { thingId },
      qs,
    });
  }
}
```

### No more option mappers

To get the same effect, clients can implement `_mapOptions`:

```js
class Example extends Gofer {
  // [...]

  _mapOptions({ accessToken, ...options }) {
    if (accessToken) {
      merge(options, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    }
    return options;
  }
}
```

The default implementation of `_mapOptions` returns the `options` unchanged.
