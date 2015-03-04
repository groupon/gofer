###
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
###

'use strict'

promiseHelpers =
  asPromise:
    value: ->
      new @Promise (resolve, reject) =>
        @on 'goferResult', (error, body, response, responseData) ->
          if error then reject error
          else resolve [ body, response, responseData ]

  getBody:
    value: -> @asPromise().then ([body]) -> body

  getResponse:
    value: -> @asPromise().then ([body, response]) -> response

  # This exists purely for convenience to make the object appear as a thenable
  # It is *not* a real promise since calling .then on a successive tick will
  # not work correctly.
  # It's recommended to convert this to a real promise as fast as possible.
  #
  # Possible ways to transform into real promise:
  #
  # * Passing it into Promise.all or Promise.race
  # * `await`ing (or `yield`ing it) in an ES7-style async function
  # * Calling .then() on it without arguments
  then:
    value: (onError, onSuccess) ->
      @getBody().then onError, onSuccess

module.exports = promiseHelpers
