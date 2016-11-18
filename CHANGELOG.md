### 2.6.2

* Verify completion timeout behavior - **[@jkrems](https://github.com/jkrems)** [#72](https://github.com/groupon/gofer/pull/72)
  - [`a651458`](https://github.com/groupon/gofer/commit/a6514586206023d9c8e2a9b2619b45543d3a20c2) **test:** Verify completion timeout behavior


### 2.6.1

* Fire IO timeouts after IO - **[@jkrems](https://github.com/jkrems)** [#71](https://github.com/groupon/gofer/pull/71)
  - [`aba053d`](https://github.com/groupon/gofer/commit/aba053da0f8dfaeb97b0d9d59b61583c3336a425) **fix:** Fire IO timeouts after IO
  - [`d51d6b2`](https://github.com/groupon/gofer/commit/d51d6b2e21151a913de172228699df20dd7412fb) **fix:** Handle socket timeouts w/ setIOTimeout


### 2.6.0

* Backport searchDomain option to 2.x - **[@jkrems](https://github.com/jkrems)** [#70](https://github.com/groupon/gofer/pull/70)
  - [`f8d1202`](https://github.com/groupon/gofer/commit/f8d12020e098c6564cd7d138fb8b0a6f15105330) **feat:** Backport searchDomain option to 2.x


### 2.5.0

* Support gofer 3 in gofer/proxy - **[@jkrems](https://github.com/jkrems)** [#68](https://github.com/groupon/gofer/pull/68)
  - [`62a6846`](https://github.com/groupon/gofer/commit/62a6846695d9645ed22e4a07e16f1dd3a8d21398) **feat:** Support gofer 3 in gofer/proxy


### 2.4.12

* Add missing inheritance in example - **[@jkrems](https://github.com/jkrems)** [#65](https://github.com/groupon/gofer/pull/65)
  - [`e1c9aa1`](https://github.com/groupon/gofer/commit/e1c9aa1afb9a3e0800ea097cdb17a4022333a151) **docs:** Add missing inheritance in example


### 2.4.11

* docs: correct number list doc typo - **[@dbushong](https://github.com/dbushong)** [#64](https://github.com/groupon/gofer/pull/64)
  - [`7737b86`](https://github.com/groupon/gofer/commit/7737b8693a675d8a5e1244d6231e1f67d0d5283b) **docs:** correct number list doc typo


### 2.4.10

* Properly forward errors - **[@jkrems](https://github.com/jkrems)** [#53](https://github.com/groupon/gofer/pull/53)
  - [`5b5289e`](https://github.com/groupon/gofer/commit/5b5289eba138292271509b56930ba7463ff3c483) **fix:** Properly forward errors


### 2.4.9

* Filter out bad header chars for node v4 - **[@jkrems](https://github.com/jkrems)** [#58](https://github.com/groupon/gofer/pull/58)
  - [`a22523a`](https://github.com/groupon/gofer/commit/a22523a3e197e70b43e3365b89c7ca59ba8d5c72) **fix:** Filter out bad header chars for node v4


### 2.4.8

* Apply latest nlm generator - **[@i-tier-bot](https://github.com/i-tier-bot)** [#55](https://github.com/groupon/gofer/pull/55)
  - [`de40928`](https://github.com/groupon/gofer/commit/de40928d7de1bc5508671c8ac771c42f93c99ee2) **chore:** Apply latest nlm generator


### 2.4.7

* Switch to nlm for publishing - **[@jkrems](https://github.com/jkrems)** [#54](https://github.com/groupon/gofer/pull/54)
  - [`f64ea27`](https://github.com/groupon/gofer/commit/f64ea27fcf89d8e3321f52fbfd60b7581839cf83) **chore:** Use nlm


2.4.6
-----
* Update README URLs based on HTTP redirects - @ReadmeCritic
  https://github.com/groupon/gofer/pull/52
* Update API.md - @g-patel
  https://github.com/groupon/gofer/pull/51

2.4.5
-----
* Include requestOptions in start event - @jkrems
  https://github.com/groupon/gofer/pull/46

2.4.4
-----
* Consistent and safe err.responseData - @jkrems
  https://github.com/groupon/gofer/pull/45

2.4.3
-----
* Keep form.options in options b/c request - @jkrems
  https://github.com/groupon/gofer/pull/44

2.4.2
-----
* Force charset for x-www-form-urlencoded by default - @jkrems
  https://github.com/groupon/gofer/pull/43

2.4.1
-----
* Never pass baseUrl to request - @jkrems
  https://github.com/groupon/gofer/pull/42

2.4.0
-----
* Bumped request version to 2.57.0 - @knoma
  https://github.com/groupon/gofer/pull/41
* Add documentation for gofer/proxy - @jkrems
  https://github.com/groupon/gofer/pull/40

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
