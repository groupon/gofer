
## Gofer - API

The module exports one class, `Gofer`.
In addition it exposes `gofer/hub` which exports [`Hub`](#hub).

### Gofer

#### new Gofer(config = {}, hub = new Hub()) -> gofer

* `config`: A config object as described in [configuration](#configuration)
* `hub`: An instance of [Hub](#hub)

This class can be used directly,
but it's mainly meant to be the base class for individual service clients.
Child classes should add `serviceName` and `serviceVersion` to their prototype.
Example:

```js
function MyClient() {
  Gofer.apply(this, arguments);
}
util.inherits(MyClient, Gofer);
MyClient.prototype.serviceName = 'myService';
MyClient.prototype.serviceVersion = require('package.json').version;
```

#### Methods modifying the prototype

##### Gofer.prototype.addOptionMapper(mapFn)

Add a new option mapper to *all* instances that are created afterwards. This
can also be called on an instance which doesn't have a global effect.

* `mapFn`: An option mapper, see [option mappers](#option-mappers)

##### Gofer.prototype.clearOptionMappers()

Clear the option mapper chain for all instances that are created afterwards.
It can also be called on an instance which does not have a global effect.

##### Gofer.prototype.registerEndpoints(endpointMap)

Registers "endpoints". Endpoints are convenience methods for easier
construction of API calls and can also improve logging/tracing. The following
conditions are to be met by `endpointMap`:

1. It maps a string identifier that is a valid property name to a function
2. The function takes one argument which is `request`
3. `request` works like `gofer.request` only that it's aware of [endpoint defaults](#configuration)

Whatever the function returns will be available as a property on instances of the Gofer class.
Reasonable variants are a function or a nested objects with functions.

```js
MyService.prototype.registerEndpoints({
  simple: function(request) {
    return function(cb) {
      return request('/some-path', cb);
    };
  },
  complex: function(request) {
    return {
      foo: function(qs, cb) {
        return request('/foo', { qs: qs }, cb);
      },
      bar: function(entity, cb) {
        return request('/bar', { json: entity, method: 'PUT' }, cb);
      }
    }
  }
});
var my = new MyService();
my.simple(function(err, body) {});
my.complex.foo({ limit: 1 }, function(err, body) {});
my.complex.bar({ name: 'Jordan', friends: 231 }, function(err, body) {});
```

#### Instance methods

##### gofer.clone()

Creates a new instance with the exact same settings and referring to the same `hub`.

##### gofer.with(overrideConfig)

Returns a copy with `overrideConfig` merged into both the endpoint- and the
service-level defaults.
Useful if you know that you'll need custom timeouts for this one call or you want to add an accessToken.

##### gofer.request(uri: String, options, cb)

* `uri`: A convenient way to specify `options.uri` directly
* `options`: Anything listed below under [options](#options)
* `cb`: A callback function that receives the following arguments:
  - `error`: An instance of `Error`
  - `body`: The, in most cases parsed, response body
  - `meta`: Stats about the request
  - `response`: The response object with headers and statusCode

The return value is generally the same as the one of `request`.
In addition to what `request` offers, it has the following methods:

* `asPromise()`: Converts the callback arguments to a promise.
  The promise resolves to an array with `[ body, response, meta ]`.
* `getBody()`: A promise of the, potentially parsed, body.
* `getResponse()`: A promise of the response object.
* `then(onResolved, onRejected)`: This function exists for convenience only.
  It makes it possible to use the result as a thenable
  that can be passed into `Promise.resolve`, `Promise.all`, etc..
  By default it will resolve to the parsed body, matching `getBody()`.
  Please note that while it has a `then` method,
  it's not a real, spec-compliant promise.
  E.g. calling `then` on the next tick of the event loop might lead to unexpected results.
  If it's not possible to pass it into one of the proper Promise methods
  in the same tick the request was created,
  it's safer to call `getBody()` explicitly.

If an HTTP status code outside of the accepted range is returned,
the error object will have the following properties:

* `type`: 'api_response_error'
* `httpHeaders`: The headers of the response
* `body`: The, in most cases parsed, response body
* `statusCode`: The http status code
* `minStatusCode`: The lower bound of accepted status codes
* `maxStatusCode`: The upper bound of accepted status codes

The accepted range of status codes is part of the [configuration](#configuration).
It defaults to accepting 2xx codes only.

If there's an error that prevents any response from being returned,
you can look for `code` to find out what happened.
Possible values include:

* `ECONNECTTIMEDOUT`: It took longer than `options.connectTimeout` allowed to establish a connection
* `ETIMEDOUT`: Request took longer than `options.timeout` allowed
* `ESOCKETTIMEDOUT`: Same as `ETIMEDOUT` but signifies that headers were received
* `EPIPE`: Writing to the request failed
* `ECONNREFUSED`: The remote host refused the connection, e.g. because nothing was listening on the port
* `ENOTFOUND`: The hostname failed to resolve
* `ECONNRESET`: The remote host dropped the connection. E.g. you are talking to another node based service and a process died.

##### gofer.applyBaseUrl(baseUrl: String, options)

Takes `options.uri`, discards everything but the `pathname` and appends it to the specified `baseUrl`.

```js
applyBaseUrl('http://api.example.com/v2', { uri: '/foo' })
  === 'http://api.example.com/v2/foo';
applyBaseUrl('http://api.example.com/v2', { uri: '/foo?x=y' })
  === 'http://api.example.com/v2/foo?x=y';
applyBaseUrl('http://api.example.com/v2', { uri: { pathname: '/zapp' } })
  === 'http://api.example.com/v2/zapp';
```

##### gofer\[httpVerb\](uri: String, options, cb)

Convenience methods to make requests with the specified http method.
Just lowercase the http verb and you've got the method name,
only exception is `gofer.del` to avoid collision with the `delete` keyword.

### Option mappers

All service-specific behavior is implemented using option mappers.
Whenever an request is made, either via an endpoint or directly via `gofer.request`,
the options go through the following steps:

1. The endpoint defaults are applied if the request was made through an endpoint
2. `options.serviceName` and `options.serviceVersion` is added
3. `options.methodName` and `options.endpointName` is added. The former defaults to the http verb but can be set to a custom value (e.g. `addFriend`). The latter is only set if the request was made through an endpoint method
4. The service-specific and global defaults are applied
5. For every registered option mapper `m` the `options` are set to `m(options)`
6. A `User-Agent` header is added if not present already
7. `null` and `undefined` values are removed from `qs`. If you want to pass empty values, you should use an empty string

Step 5 implies that every option mapper is a function that takes one argument `options` and returns transformed options.
Inside of the mapper `this` refers to the `gofer` instance.
The example contains an option mapper that handles access tokens and a default base url.

By default every `gofer` class starts of with one option mapper.
It just calls `gofer.applyBaseUrl` if `options.baseUrl` is passed in.

#### Options

In addition to the options mentioned in the [request docs](https://github.com/mikeal/request#requestoptions-callback), `gofer` offers the following options:

* `connectTimeout`: How long to wait until a connection is established
* `baseUrl`: See `applyBaseUrl` above
* `parseJSON`: The `json` option offered by request itself will silently ignore when parsing the body fails. This option on the other hand will forward parse errors. It defaults to true if the response has a json content-type and is non-empty
* `minStatusCode`: The lowest http status code that is acceptable. Everything below will be treated as an error. Defaults to `200`
* `maxStatusCode`: The highest http status code that is acceptable. Everything above will be treated as an error. Defaults to `299`
* `requestId`: Useful to track request through across services. It will added as an `X-Request-ID` header. See [events and logging](#events-and-logging) below
* `serviceName`: The name of the service that is talked to, e.g. "github". Used in the user-agent
* `serviceVersion`: By convention the client version. Used in the user-agent
* `pathParams`: If your `uri` includes `{tags}` they will be matched by this object. You can use this instead of string manipulation as this object is also logged
* `searchDomain`: Inspired by the `search` setting in `/etc/resolv.conf`.
  Append this to any hostname that doesn't already end in a ".".
  E.g. `my-hostname` turns into `my-hostname.<searchDomain>.` but `my.fully.qualified.name.` won't be touched.
* `keepAlive`: If set to `true`, enables the request `forever` option and does
  not send the `Connection: close` header

In addition the following options are added that are useful for instrumentation but do not affect the actual HTTP request:

* `endpointName`: The name of the "endpoint" or part of the API, e.g. "repos"
* `methodName`: Either just an http verb or something more specific like "repoByName". Defaults to the http verb (`options.method`)

#### Configuration

All parts of the configuration end up as options.
There are three levels of configuration:

* `globalDefaults`: Used for calls to any service
* `[serviceName].*`: Only used for calls to one specific service
* `[serviceName].endpointDefaults[endpointName].*`: Only used for calls using a specific endpoint

```js
var Gofer = require('gofer');
var util = require('util');

var config = {
  "globalDefaults": { "timeout": 100, "connectTimeout": 55 },
  "a": { "timeout": 1001 },
  "b": {
    "timeout": 99,
    "connectTimeout": 70,
    "endpointDefaults": {
      "x": { "timeout": 23 }
    }
  }
};

function GoferA() { Gofer.apply(this, arguments); }
util.inherits(GoferA, Gofer);

function GoferB() { Gofer.apply(this, arguments); }
util.inherits(GoferB, Gofer);

GoferB.prototype.registerEndpoints({
  x: function(request) {
    return function(cb) { return request('/something', cb); }
  }
});

var a = new GoferA(config), b = new GoferB(config);
a.request('/something'); // will use timeout: 1001, connectTimeout: 55
b.request('/something'); // will use timeout: 99, connectTimeout: 70
b.x(); // will use timeout: 23, connectTimeout: 70
```

### Proxy

Sometimes it can be convenient to have routes in an app
that just proxy to some external service,
e.g. to consume that data from client-side code without touching CORS.
Gofer comes with a proxy helper.
Example of using it in an express app:

```js
var proxy = require('gofer/proxy')
app.use('/my-service', function(req, res, next) {
  // Assuming `myServiceClient instanceof Gofer`
  proxy(myServiceClient, req, res, next);
});
```

Gofer will automatically omit the `callback` query parameter
that is often used to implement JSONP in APIs.

**Warning:** A route like this can present a serious attack vector.
There are often better alternatives
like adding well-chosen CORS headers to the service
or adding higher-level functionality (aggregation / transformation)
to your app instead of exposing raw responses from upstream services.
If there's no way around proxying,
it's a good idea to explicitly whitelist the exact methods and urls
that are expected to be hit.

### Hub

Every `gofer` instance has a reference to a "hub".
The hub is used to make all calls to request and exposes a number of useful events.
The following snippet shows how to share a hub across multiple gofer instances:

```js
var GoferA = require('a-gofer'); // client for service "a"
var GoferB = require('b-gofer'); // client for service "b"

var hub = require('gofer/hub')(); // create a new hub
var goferA = new GoferA({ /* config */ }, hub);
var goferB = new GoferB({ /* config */ }, hub);

hub.on('success', function() {}); // this will fire for every successful
                                  // request using either goferA or goferB
```

#### Events and Logging

There are a couple of things `gofer` does that are opinionated but may make your life easier.

1.  It assumes you are using `x-request-id` headers.
    These can be very useful when tracing a request through multiple levels in the stack.
    Heroku has a [nice description](https://devcenter.heroku.com/articles/http-request-id).
2.  It uses unique `x-fetch-id` headers for each http request.
3.  All timings are reported in seconds with microtime precision.
4.  Data added to `options.logData` will be added to `start`, `fetchError`, `success` and `failure` messages.


##### start

A service call is attempted.
Event data:

```js
{ fetchStart: Float, // time in seconds
  requestOptions: options, // options passed into request
  requestId: UUID, // id of the overall transaction
  fetchId: UUID, // id of this specific http call
  uri: String, // the URI requested
  method: String, // uppercase HTTP verb, PUT/GET/...
  serviceName: String, // Config key ex: github
  endpointName: String, // Function name ex: repos
  methodName: String, // Defaults to lowercase HTTP verb but configurable per request
  pathParams: Object } // key/value pairs used in {tag} replacement
```


##### socketQueueing

Waiting for a socket. See [`http.globalAgent.maxSockets`](http://nodejs.org/api/http.html#http_agent_maxsockets).
Event data:

```js
{ maxSockets: http.globalAgent.maxSockets,
  queueReport: Array[String] } // each entry contains "<host>: <queueLength>"
```


##### connect

Connected to the remote host, transfer may start.
Event contains the data from `start` plus:

```js
{ connectDuration: Float } // time in seconds to establish a connection
```


##### success

All went well.
Event data:

```js
{ statusCode: Integer, // the http status code
  uri: String,
  method: String, // uppercase http verb, PUT/GET/...
  connectDuration: Float,
  fetchDuration: Float,
  requestId: UUID,
  fetchId: UUID,
  serviceName: String,
  endpointName: String,
  pathParams: Object }
```


##### fetchError

A transport error occured (e.g. timeouts).
Event contains the data from `success` plus:

```js
{ statusCode: String, // the error code (e.g. ETIMEDOUT)
  syscall: String, // the syscall that failed (e.g. getaddrinfo)
  error: error, // the raw error object
  serviceName: String,
  endpointName: String,
  pathParams: Object }
```


##### failure

An invalid status code was returned.
Event contains the data from `success`.
