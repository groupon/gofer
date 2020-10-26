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

const Gofer = require('../');
const { version, name } = require('../package.json');

const DEFAULT_BASE_URL = 'https://api.github.com';

// Generate our ServiceClient class
class GithubClient extends Gofer {
  constructor(config) {
    super(config, 'github', version, name);
  }

  createAccessToken(oauthCode) {
    /**
     * Exchange auth- for access token
     *
     * @see http://developer.github.com/v3/oauth/#web-application-flow
     */
    return this.fetch('/login/oauth/access_token', {
      endpointName: 'createAccessToken',
      oauthCode,
      method: 'POST',
      json: true,
    })
      .json()
      .then(res => res.access_token);
  }

  userRepos(username, qs) {
    // fetch(url: string, options, callback)
    return this.fetch(username ? '/users/{username}/repos' : '/user/repos', {
      endpointName: 'userRepos',
      pathParams: { username },
      qs: Object.assign({ per_page: 100 }, qs),
    }).json();
  }

  emojis() {
    return this.fetch('/emojis', { endpointName: 'emojis' }).json();
  }
}

GithubClient.prototype.addOptionMapper(opts => {
  // We extract all options we will be handling ourselves and then remove
  // them, making sure nobody gets confused by them
  const {
    accessToken,
    oauthCode,
    webUrl,
    clientId,
    clientSecret,
    ...otherOpts
  } = opts;

  opts = otherOpts;

  if (accessToken) {
    opts.headers = opts.headers || {};
    opts.headers.authorization = `token ${accessToken}`;
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

  return Object.assign({ baseUrl: DEFAULT_BASE_URL }, opts);
});

module.exports = GithubClient;

if (require.main === module) {
  /* eslint-disable no-console */

  const github = new GithubClient({
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
  github.emojis().json().then(console.log, console.error);

  // List repos of the `groupon` github org
  github.userRepos('groupon').then(repoList => {
    repoList.forEach(repo => {
      console.log(repo.name, '\t#', repo.description);
    });
  }, console.error);

  // Make a raw call to `/` (resource discovery)
  github
    .fetch('/')
    .then(response => {
      console.log('Status code: %d', response.statusCode);
      return response.json();
    })
    .then(data => {
      console.log('Returned %d resources', Object.keys(data).length);
    })
    .catch(console.error);

  // This is expected to fail unless you pass in a valid access token. If you
  // do, this will output the first of your repos.
  github.userRepos({ accessToken: process.env.GH_TOKEN }).then(
    myRepos => {
      if (myRepos.length) {
        console.log('One of your repos: %s', myRepos[0].name);
      } else {
        console.log('No repositories found');
      }
    },
    error => {
      console.log('Failed to get repos, try passing in an access token');
      console.log(error.message);
    }
  );

  /* eslint-enable no-console */
}
