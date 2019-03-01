# `gofer`

> A gofer, go-fer or gopher /ˈɡoʊfər/ is an employee who specializes
> in delivery of special items to their superior(s).
> The special items may be anything from a cup of coffee to a tailored
> suit or a car.
>
> — <cite>[Wikipedia: Gofer](https://en.wikipedia.org/wiki/Gofer)</cite>

```
npm install --save gofer
```

A base class for HTTP clients.
Usable in node, browsers, and react-native.
The design is meant to enforce a certain level of consistency in how the
clients are configured and instrumented.

Use in browsers might require a `fetch` polyfill.

If you used `gofer` 2.x before,
you might want to read about [all the changes in 3.x](/BREAKING_v3.md).

If you have some old `gofer` 3.x code that doesn't use classes and Promises,
you can read the [previous version of the 3.x docs][old-3x-docs].

[old-3x-docs]: https://github.com/groupon/gofer/blob/v3.7.0/README.md

**[API docs](/API.md)** •
**[Walkthrough](#walkthrough)**

### Features

#### Options mappers

Option mappers are called in the order they are
registered in and can potentially do *anything* they want.
This can range from applying defaults over resolving custom api options
to injecting access tokens.


#### Defaults merging

All configuration is just defaults which is one of the things making
option mappers so powerful.

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
const client = new MyApiClient(config);

// After retrieving an access token
const authenticatedClient = client.with({ accessToken: 'some-token' });

// This one will now send an access token
// ~> `curl -H 'Authentication: Bearer some-token' \
//          http://api.example.com/personal/some-id`
authenticatedClient.protectedResource('some-id');

// This one was not changed, so it will not send one
// ~> `curl http://api.example.com/personal/some-id`
client.protectedResource('some-id');
```


### This sounds great, but...

#### Why not use service specific client libraries?

Well, in a way that's what `gofer` encourages.
The difference is that by basing all client libraries on this one,
you gain consistency and unified configuration.
Creating a client for a new service often takes just a couple of lines.

#### Why not use [`request`](https://github.com/request/request)?

`request` is a great swiss army knive for making API calls.
This makes it an awesome first pick if you're looking for a quick way to
talk to a wide variety of 3rd party services.
But it's lacking in a few areas we care a lot about:

* Good, predictable error handling
* Flexible configuration
* Instrumentation friendly


## Walkthrough

Let's say we need a client for the Github API.
The first step is to generate a Github client class:

```js
const Gofer = require('gofer');

const { version, name } = require('./package.json')

class Github extends Gofer {
  constructor(config) {
    super(config, 'github', version, name);
  }
}
```

The name you choose here ("github") determines which section of the
configuration it will accept.
It's also part of the instrumentation as `serviceName`.

Let's define a simple endpoint to get the emojis from Github:

```js
class Github extends Gofer {
  /* earlier stuff here */

  // Every instance of Github will get an `emojis` method, which has access
  // to `this.fetch()`  The `fetch` method works similar to WHATWG/fetch.
  emojis() {
    // fetch(uri: string, options: object?, callback: function?)
    return this.fetch('/emojis');
  }
}
```

To create an instance, we need to provide configuration.
Configuration exists on three levels: global, per-service, and per-endpoint.

```js
const config = {
  globalDefaults: {
    // these apply to all gofers
    connectTimeout: 30,
    timeout: 100,
  },
  github: {
    // these apply for every call made with Github
    clientId: '<VALID CLIENT ID HERE>',
    endpointDefaults: {
      // these only apply for calls to the emojis endpoint
      emojis: {
        connectTimeout: 100,
        timeout: 2000,
      },
    },
  },
};
```

To make our client a little nicer to use we'll add an [option mapper](/API.md#option-mappers) that defaults `baseUrl` to the public Github API.
The options we return will be passed on to `fetch`.

```js
Github.prototype.addOptionMapper(opts =>
  // opts contains the already merged options, including global-, service-,
  // and endpoint-defaults. In our example opts.timeout will be 2000, etc.
  Object.assign({ baseUrl: 'https://api.github.com' }, opts);
);
```

Finally we can instantiate and make the call:

```js
const github = new Github(config);

// The `fetch`-style:
github.emojis()
  .then(res => res.json())
  .then(emojiList => {
    console.log('Returned %d emojis', Object.keys(emojiList).length);
  })
  .catch(console.error);

// Using the added convenience of req.json()
github.emojis()
  .json()
  .then(emojiList => { /* ... same ... */ })
  .catch(console.error);
```

You can check `examples/github.js` for a richer example.

## File Uploads

Gofer does not by default ship with support for `multipart/form-data` file
uploads, but it is easy to add, using the [form-data][form-data] module,
and an option mapper as shown in this [multi-part mapper test][multi-part].

[form-data]: https://www.npmjs.com/package/form-data
[multi-part]: test/multi-part-mapper.test.js
