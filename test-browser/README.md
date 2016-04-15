# `gofer` - Browser Tests

These tests are run via `test/browser.test.js`.
It uses mochify to run parts of our test suite in phantomjs.
That's great for CI but tends to be hard to debug.

So for debugging purposes there's:

1. Start the test API: `node test/mock-service.js`
2. Create the test HTML page (see below)
3. Open `tmp/test.html` in your browser

```bash
mochify --watch --consolify tmp/test.html --reporter spec ./node_modules/promise/polyfill ./node_modules/whatwg-fetch ./test-browser/**/*.test.js
```
