/*
Copyright (c) 2014, Groupon, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

Neither the name of GROUPON nor the names of its contributors may be
used to endorse or promote products derived from this software without
specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
'use strict';
var assign = require('lodash/assign');
var omit = require('lodash/omit');

var Gofer = require('../');
var pkg = require('../package.json');

// Generate our ServiceClient class
function GithubClient() {
  Gofer.call(this, 'github', pkg.version);
}
GithubClient.prototype = Object.create(Gofer.prototype);
GithubClient.prototype.constructor = GithubClient;

var DEFAULT_BASE_URL = 'https://api.github.com';
GithubClient.prototype.addOptionMapper(function githubDefaults(opts) {
  // We extract all options we will be handling ourselves and then remove
  // them, making sure nobody gets confused by them
  var accessToken = opts.accessToken;
  var oauthCode = opts.oauthCode;
  var webUrl = opts.webUrl;
  var clientId = opts.clientId;
  var clientSecret = opts.clientSecret;

  opts = omit(opts,
    'accessToken',
    'oauthCode',
    'webUrl',
    'clientId',
    'clientSecret'
  );

  if (accessToken) {
    opts.headers = opts.headers || {};
    opts.headers.authorization = 'token ' + accessToken;
  }

  // There's only call using this but since clientId, clientSecret and webUrl
  // all are part of the configuration, we'll handle it here.
  if (oauthCode) {
    opts.baseUrl = webUrl;
    opts.form = {
      code: oauthCode,
      client_id: clientId,
      client_secret: clientSecret,
    };
  }

  return assign({ baseUrl: DEFAULT_BASE_URL }, opts);
});

// Endpoints will be added to the prototype of the client, on access they
// will be initialized with a pre-configured function to make requests. The
// name of the function happens to be `request` because it (apart from some
// magical injection of parameters) forwards its arguments to request.
GithubClient.prototype.registerEndpoints({
  // This is one possible style of "endpoint": a namespace for functions.
  // Usage: `github.accessToken.create('my-code').pipe(process.stdout);`
  accessToken: function accessToken(request) {
    /**
     * Exchange auth- for access token
     *
     * @see http://developer.github.com/v3/oauth/#web-application-flow
     */
    return {
      create: function create(oauthCode, cb) {
        // request(uri: string, options, callback)
        return request('/login/oauth/access_token', {
          oauthCode: oauthCode,
          json: true,
          method: 'POST',
        }, cb);
      },
    };
  },

  // Different style: "entity actions"
  // Usage: `github.user('groupon').repos().pipe(process.stdout)`
  user: function user(fetch) {
    return function withUser(username) {
      return {
        repos: function repos(qs, cb) {
          if (typeof qs === 'function') {
            cb = qs;
            qs = {};
          }

          // fetch(url: string, options, callback)
          return fetch(username ? ('/users/{username}/repos') : '/user/repos', {
            pathParams: { username: username },
            qs: assign({ per_page: 100 }, qs),
          }, cb);
        },
      };
    };
  },

  // The simplest thing last: an endpoint that is just a method
  // Usage: `github.emojis().pipe(process.stdout)`
  emojis: function (fetch) {
    return function emojis(cb) {
      // fetch(url: string, options, callback)
      return fetch('/emojis', {}, cb);
    };
  },
});

module.exports = GithubClient;

if (require.main === module) {
  /* eslint no-console:0 */
  var github = new GithubClient({
    globalDefaults: {
      timeout: 5000,
      connectTimeout: 1000,
    },
    github: {
      clientId: process.env.GH_CLIENT || '<VALID CLIENT ID HERE>',
      clientSecret: process.env.GH_SECRET || '<VALID CLIENT SECRET HERE>',
    },
  });

  // Get all supported emojis, dump response to stdout
  github.emojis().json().then(console.log);

  // List repos of the `groupon` github org
  github.user('groupon').repos(function (err, repoList) {
    if (err) throw err;
    repoList.forEach(function (repo) {
      console.log(repo.name, '\t#', repo.description);
    });
  });

  // Make a raw call to `/` (resource discovery)
  github.fetch('/', function (err, data, response) {
    if (err) throw err;
    console.log('Status code: %d', response.statusCode);
    console.log('Returned %d resources', Object.keys(data).length);
  });

  // This is expected to fail unless you pass in a valid access token. If you
  // do, this will output the first of your repos.
  github.fetch('/user/repos', {
    accessToken: process.env.GH_TOKEN,
  }).done(function (myRepos) {
    if (myRepos.length) {
      console.log('One of your repos: %s', myRepos[0].name);
    } else {
      console.log('No repositories found');
    }
  }, function (error) {
    console.log('Failed to get repos, try passing in an access token');
    console.log(error.message);
  });
}
