2.3.7
-----
* dont send result immediately in case request is a synchronous call - @chkhoo #39

2.3.6
-----
* fix JSON.stringify bad error object - @chkhoo #38

2.3.5
-----
* fix silenced JSON parsing errors - @chkhoo #36

2.3.4
-----
* Preserve errors for error responses - @jkrems
  https://github.com/groupon/gofer/pull/35

2.3.3
-----
* Add an early error if timeouts aren't numbers - @jkrems #33

2.3.2
-----
* Make sure to be compatible with older hubs - @jkrems #32

2.3.1
-----
* Make sure the default User-Agent matches the spec - @khoomeister #31

2.3.0
-----
* Migrate to latest deps and rebuild - @jkrems #28
* Support using the result as a promise - @jkrems #27

2.2.1
-----
* Build a default user agent to help track down misconfigured clients - @abloom #25
* Do not send headers that are null/undefined - @jkrems #23

2.2.0
-----
* Added `gofer/proxy` - @danmconrad #24

2.1.5
-----
* Run tests on iojs - @jkrems #22
* Example in README file updated - @renatomoya #21

2.1.4
-----
* Removing microtime in favor of a native solution - @abloom #20

2.1.3
-----
* Upgrade npub and add licenses - @abloom #19

v1.0.0
------
* Initial release
