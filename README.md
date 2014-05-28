# gofer

> A gofer, go-fer or gopher /ˈɡoʊfər/ is an employee who specializes in delivery of special items to their superior(s).
> The special items may be anything from a cup of coffee to a tailored suit or a car.
> 
> — <cite>[Wikipedia: Gofer](http://en.wikipedia.org/wiki/Gofer)</cite>

```
npm install --save gofer
```

A base library to develop specialized ReST clients with.
The general design is meant to enforce a certain level of consistency in how the clients are configured and instrumented.
Uses [request](https://github.com/mikeal/request) to do the actual fetching.

**[API docs](/API.md)** •
**[Walkthrough](#walkthrough)**


### Features

#### Options mappers

Option mappers are called in the order they are
registered in and can potentially do *anything* they want.
This can range from applying defaults over resolving custom api options to injecting access tokens.

By default only one option mapper is added which applies a base url if it's
configured.


#### Defaults merging

All configuration is just defaults which is one of the things making option mappers so powerful.
The precedence rules are (first wins):

1. Explicit configuration in the API call
2. Scoped overrides using `client.with(options)`
3. Endpoint-level defaults
4. Service-level defaults
5. Global defaults

See the [walkthrough](#walkthrough) below for how these are configured.


#### Copy with defaults / scoped overrides

You can create a copy of the API with hard defaults using `with`.
This enables a nice pattern:

```js
// We'll assume MyApiClient has an option mapper than knows how to
// properly send an accessToken, e.g. using an Authentication header
var client = new MyApiClient(config);

// After retrieving an access token
var authenticatedClient = client.with({ accessToken: 'some-token' });

// This one will now send an access token
// ~> `curl -H 'Authentication: Bearer some-token' \
//          http://api.example.com/personal/some-id`
authenticatedClient.protectedResource('some-id', function(err, data) {});

// This one was not changed, so it will not send one
// ~> `curl http://api.example.com/personal/some-id`
client.protectedResource('some-id', function(err, data) {});
```


#### Instrumentation of start, connect, success, failure, and error

`client.hub` exposes the following events:

* `start`: A service call is attempted
* `socketQueueing`: Waiting for a socket. See [`http.globalAgent.maxSockets`](http://nodejs.org/api/http.html#http_agent_maxsockets)
* `connect`: Connected to the remote host, transfer may start
* `fetchError`: A transport error occured (e.g. timeouts)
* `failure`: An invalid status code was returned
* `success`: All went well

A hub can be shared across multiple gofer instances.
You can find more details on what the log events look like in the [API docs](/API.md).


### This sounds great, but...

#### Why not use service specific client libraries?

Well, in a way that's what `gofer` encourages.
The difference is that by basing all client libraries on this one,
you gain consistency and unified configuration.
Creating a client for a new service often takes only a couple of lines.

#### Why not just use `request` directly?

If you have just one service to talk to or a handful endpoints that behave roughly the same,
then this library is certainly overkill.
But, if you want to easily manage configuration for different services including sane handling of endpoint-specific settings like differing timeouts,
then you might end up reimplementing a lot of the things in here.
Also, [logging](/API.md#events-and-logging).


## Walkthrough

Let's say we need a client for the Github API.
The first step is to generate a Github client class:

```js
var Github = require('gofer')('github');
```

The name you choose here determines which section of the configuration it will accept.
It's also part of the instrumentation as `serviceName`.

Let's define a simple endpoint to get the emojis from Github:

```js
Github.registerEndpoints({
  // Every instance of Github will get an `emojis` property. On
  // access it will be initialized with an instrumented version of the
  // `request` function. The `request` function works mostly like mikeal's
  // `request`, though properties like `request.put` won't work.
  emojis: function(request) {
    // the value returned here will be what users see in `new Github().emojis`
    return function(cb) {
      // request(uri: string, options: object?, callback)
      return request('/emojis', cb);
    };
  }
});
```

To create an instance, we need to provide configuration.
Configuration exists on three levels: global, per-service, and per-endpoint.

```js
var config = {
  globalDefaults: {
    // these apply to all gofers
    connectTimeout: 30,
    timeout: 100
  },
  github: {
    // these apply for every call made with Github
    clientId: '<VALID CLIENT ID HERE>',
    endpointDefaults: {
      // these only apply for calls to the emojis endpoint
      emojis: {
        connectTimeout: 100,
        timeout: 2000
      }
    }
  }
};
```

To make our client a little nicer to use we'll add an [option mapper](/API.md#option-mappers) that defaults `baseUrl` to the public Github API.
The options we return will be passed on to `request`.

```js
// Since the default option mapper would already try to apply a base url,
// we need to remove it.
Github.clearOptionMappers();
omit = require('lodash').omit;
Github.addOptionMapper(function(opts) {
  // opts contains the already merged options, including global-, service-,
  // and endpoint-defaults. In our example opts.uri will be '/emojis',
  // opts.timeout will be 2000, and opts.clientId... you get the idea.
  var baseUrl = opts.baseUrl || 'https://api.github.com';

  // `this` refers to the Github instance, applyBaseUrl is built-in
  // The default option mapper will just apply a base url if provided
  return this.applyBaseUrl(
    baseUrl,
    // it's a good practice to remove options you already handled
    omit(opts, 'baseUrl')
  );
});
```

Finally we can instantiate and make the call:

```js
var github = new Github(config);
github.emojis().pipe(process.stdout);
// or, to get all the things
github.emojis(function(err, emojiList, stats, response) {
  if (err) throw err;
  console.log('It took %d seconds', stats.fetchDuration);
  console.log('Status code: %d', response.statusCode);
  console.log('Returned %d emojis', Object.keys(data).length);
});
```

You can check `examples/github.js` for a richer example.
