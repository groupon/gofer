
// We use this to safely extend objects without mutating the input values
var merge = require('deepmerge');
var _ = require('lodash');
var util = require('util');

var Gofer = require('../');

// Generate our ServiceClient class
function GithubClient() {
  Gofer.apply(this, arguments);
}
util.inherits(GithubClient, Gofer);
GithubClient.prototype.serviceName = 'github';
GithubClient.prototype.serviceVersion = require('../package.json').version;

// We need to do our own baseUrl handling to dynamically switch to the web
// url for the oauth token exchange.
GithubClient.prototype.clearOptionMappers();

// The option mapper is called with the client instance as `this` - which
// will enable us to call applyBaseUrl at the end.
GithubClient.prototype.addOptionMapper(function(opts) {
  // We extract all options we will be handling ourselves and then remove
  // them, making sure nobody gets confused by them
  var
      accessToken = opts.accessToken,
      oauthCode = opts.oauthCode,
      baseUrl = opts.baseUrl || 'https://api.github.com',
      webUrl = opts.webUrl,
      clientId = opts.clientId,
      clientSecret = opts.clientSecret;

  opts = _.omit(opts,
    'accessToken',
    'oauthCode',
    'baseUrl',
    'webUrl',
    'clientId',
    'clientSecret'
  );

  // Temporary until there's a default user agent natively
  opts.headers = opts.headers || {};
  opts.headers['User-Agent'] =
    'service-client/' + require('../package.json').version;

  if (accessToken) {
    opts.headers.authorization = 'token ' + accessToken;
  }

  // There's only call using this but since clientId, clientSecret and webUrl
  // all are part of the configuration, we'll handle it here.
  if (oauthCode) {
    baseUrl = webUrl;
    opts.form = {
      code: oauthCode,
      client_id: clientId,
      client_secret: clientSecret
    };
  }

  return this.applyBaseUrl(baseUrl, opts);
});

// Small helper to make the results of our endpoints a little more
// async-friendly.
function extractDataOnly(cb) {
  return function(err, data) { return cb && cb(err, data); };
}

// Endpoints will be added to the prototype of the client, on access they
// will be initialized with a pre-configured function to make requests. The
// name of the function happens to be `request` because it (apart from some
// magical injection of parameters) forwards its arguments to request.
GithubClient.prototype.registerEndpoints({
  // This is one possible style of "endpoint": a namespace for functions.
  // Usage: `github.accessToken.create('my-code').pipe(process.stdout);`
  accessToken: function(request) {
    /**
     * Exchange auth- for access token
     *
     * @see http://developer.github.com/v3/oauth/#web-application-flow
     */
    return {
      create: function(oauthCode, cb) {
        // request(uri: string, options, callback)
        return request('/login/oauth/access_token', {
          oauthCode: oauthCode,
          json: true,
          method: 'POST'
        }, cb);
      }
    }
  },

  // Different style: "entity actions"
  // Usage: `github.user('groupon').repos().pipe(process.stdout)`
  user: function(request) {
    return function withUser(username) {
      return {
        repos: function(qs, cb) {
          if ('function' === typeof qs) cb = qs, qs = {};

          // request(options, callback)
          return request({
            // If `uri` is not passed in as the first argument, it's a
            // required property of options
            uri: username ? ('/users/{username}/repos') : '/user/repos',
            pathParams: {
              username: username
            },
            qs: merge({ per_page: 100 }, qs)
          }, extractDataOnly(cb));
        }
      };
    };
  },

  // The simplest thing last: an endpoint that is just a method
  // Usage: `github.emojis().pipe(process.stdout)`
  emojis: function(request) {
    return function(cb) {
      // request(uri: string, callback)
      return request('/emojis', cb);
    };
  }
});

module.exports = GithubClient;

if (require.main === module) {
  var github = new GithubClient({
    globalDefaults: {
      timeout: 5000,
      connectTimeout: 1000
    },
    github: {
      clientId: '<VALID CLIENT ID HERE>',
      clientSecret: '<VALID CLIENT SECRET HERE>'
    }
  });

  // Get all supported emojis, pipe response body to stdout
  github.emojis().pipe(process.stdout);

  // List repos of the `groupon` github org
  github.user('groupon').repos(function(err, repoList) {
    if (err) throw err;
    repoList.forEach(function(repo) {
      console.log(repo.name, '\t#', repo.description);
    });
  });

  // Make a raw call to `/` (resource discovery)
  github.fetch('/', function(err, data, stats, response) {
    if (err) throw err;
    console.log('It took %d seconds', stats.fetchDuration);
    console.log('Status code: %d', response.statusCode);
    console.log('Returned %d resources', Object.keys(data).length);
  });

  // This is expected to fail unless you pass in a valid access token. If you
  // do, this will output the first of your repos.
  var req = github.fetch('/user/repos', {
    accessToken: process.env.TOKEN
  }, function(err, myRepos) {
    if (err) {
      console.log('Failed to get repos, try passing in an access token');
      console.log(err.message, myRepos);
    } else if (myRepos.length) {
      console.log('One of your repos: %s', myRepos[0].name);
    } else {
      console.log('No repositories found');
    }
  });
}
