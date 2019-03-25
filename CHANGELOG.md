### 3.7.5

* fix: bug in body validation - **[@dbushong](https://github.com/dbushong)** [#96](https://github.com/groupon/gofer/pull/96)
  - [`c21d116`](https://github.com/groupon/gofer/commit/c21d116b3962820b9a6db37206bd17bdd2b75923) **fix:** bug in body validation


### 3.7.4

* Respect secureContext in options - **[@jkrems](https://github.com/jkrems)** [#95](https://github.com/groupon/gofer/pull/95)
  - [`f338444`](https://github.com/groupon/gofer/commit/f338444ed34771cde5898c976955812bbe85e338) **fix:** Respect secureContext in options


### 3.7.3

* add note to README about multi-part uploads - **[@dbushong](https://github.com/dbushong)** [#94](https://github.com/groupon/gofer/pull/94)
  - [`5b35197`](https://github.com/groupon/gofer/commit/5b351970b6744fb9857fa6fcea8f3f61cba3beba) **docs:** add note to README about multi-part uploads


### 3.7.2

* update lockfile for security audit - **[@dbushong](https://github.com/dbushong)** [#93](https://github.com/groupon/gofer/pull/93)
  - [`f106211`](https://github.com/groupon/gofer/commit/f106211e6ad6f043b2300b662863f1ed43e4091f) **chore:** update lockfile for security audit - see: [2018-16472](See: https://nvd.nist.gov/vuln/detail/CVE-2018-16472)


### 3.7.1

* modern docs & deps - **[@dbushong](https://github.com/dbushong)** [#92](https://github.com/groupon/gofer/pull/92)
  - [`6cced2e`](https://github.com/groupon/gofer/commit/6cced2ea02c2b7805191a3f3579c76a6f257faae) **docs:** update docs to use modern JS
  - [`7296fe7`](https://github.com/groupon/gofer/commit/7296fe77cc5be83d87f3bbe7d6c398a0c900e6a7) **docs:** update examples to use modern JS
  - [`a60fe6c`](https://github.com/groupon/gofer/commit/a60fe6cb8fa53aa130777f19227618e79af29cd0) **chore:** run travis on more modern setup
  - [`f2c822a`](https://github.com/groupon/gofer/commit/f2c822a352f8f4e69f36c1fc7badae7d1e6c62c8) **chore:** update lint rules
  - [`482213b`](https://github.com/groupon/gofer/commit/482213b731fd89f94c2b5d95f6daa3afeb92116f) **chore:** update deps to make `npm audit` clean


### 3.7.0

* Add gofer.getMergedOptions - **[@jkrems](https://github.com/jkrems)** [#91](https://github.com/groupon/gofer/pull/91)
  - [`fb9809e`](https://github.com/groupon/gofer/commit/fb9809ead2ebed842a4e86b9200084648a6a7065) **feat:** Add gofer.getMergedOptions


### 3.6.0

* support `fetch().stream().then()` - **[@dbushong](https://github.com/dbushong)** [#90](https://github.com/groupon/gofer/pull/90)
  - [`19b6c1e`](https://github.com/groupon/gofer/commit/19b6c1e50878ecd9d951f4213c3c5fb0f7aae100) **feat:** support `fetch().stream().then()`
  - [`a9b6483`](https://github.com/groupon/gofer/commit/a9b6483dba99f1b20a94936f00a6d5b11992bacf) **docs:** wrap API docs @ 80 columns
  - [`6c8e040`](https://github.com/groupon/gofer/commit/6c8e04032cb8feb13adc2ff8452e0a1fae83a352) **docs:** `.json()`, `.text()`, etc.


### 3.5.8

* don't set connect timeout for keepalive - **[@dbushong](https://github.com/dbushong)** [#86](https://github.com/groupon/gofer/pull/86)
  - [`cd57ced`](https://github.com/groupon/gofer/commit/cd57ced861752d43dba670391e4181f443442331) **fix:** don't set connect timeout for keepalive


### 3.5.7

* clear completionTimer on response completion - **[@dbushong](https://github.com/dbushong)** [#84](https://github.com/groupon/gofer/pull/84)
  - [`368d061`](https://github.com/groupon/gofer/commit/368d061c7d6cdd90d795113940c70b081db88ecc) **fix:** clear completionTimer on response completion


### 3.5.6

* use proper timeout to fix keepAlive - **[@dbushong](https://github.com/dbushong)** [#83](https://github.com/groupon/gofer/pull/83)
  - [`7eb902f`](https://github.com/groupon/gofer/commit/7eb902f30fc739bc511f8dd2ec093f4b597dcdbd) **fix:** use proper timeout to fix keepAlive


### 3.5.5

* Ignore searchDomain for localhost and IP - **[@jkrems](https://github.com/jkrems)** [#80](https://github.com/groupon/gofer/pull/80)
  - [`8cfb230`](https://github.com/groupon/gofer/commit/8cfb230673dafb6907c0fa7a6d5facc02980ae9b) **fix:** Ignore searchDomain for localhost and IP


### 3.5.4

* Apply latest nlm generator - **[@markowsiak](https://github.com/markowsiak)** [#79](https://github.com/groupon/gofer/pull/79)
  - [`9ea499a`](https://github.com/groupon/gofer/commit/9ea499a2b914f8c27e74da75d7952802df26c550) **chore:** apply latest generator


### 3.5.3

* Fix header option leak - **[@jkrems](https://github.com/jkrems)** [#78](https://github.com/groupon/gofer/pull/78)
  - [`4168096`](https://github.com/groupon/gofer/commit/4168096af97360da470393854e884233f90f5226) **test:** Remove fixed certificates
  - [`35a22df`](https://github.com/groupon/gofer/commit/35a22df316ee0f149d3d4aa3be0535ab3e841644) **test:** Use smaller reddit endpoint
  - [`c6a2397`](https://github.com/groupon/gofer/commit/c6a239763d3251591223d90b84e2d7e27d8f16c2) **fix:** Prevent mutation of defaults
  - [`485414a`](https://github.com/groupon/gofer/commit/485414a75ad0883589f0ed7de51908d08f0b9b28) **test:** Verify that headers do not leak into defaults


### 3.5.2

* Fix link to breaking changes doc - **[@jkrems](https://github.com/jkrems)** [#77](https://github.com/groupon/gofer/pull/77)
  - [`eb790cc`](https://github.com/groupon/gofer/commit/eb790cc2271228a047be1fd20c94ffe23811ef9e) **docs:** Fix link to breaking changes doc
  - [`0d9759a`](https://github.com/groupon/gofer/commit/0d9759acef04ef46c5d6ebf57b41d8a55a3ecce7) **chore:** Modernize travis config
  - [`ea684dd`](https://github.com/groupon/gofer/commit/ea684dd0826ae576438dce0cbb444769a63c7405) **test:** Compare to proper base timing
  - [`fedc713`](https://github.com/groupon/gofer/commit/fedc713c4a0370e262f02625347e3cbb3c38f225) **chore:** Ignore package-lock.json


### 3.5.1

* Publish 3.x from master - **[@jkrems](https://github.com/jkrems)** [#76](https://github.com/groupon/gofer/pull/76)
  - [`a152e6a`](https://github.com/groupon/gofer/commit/a152e6aa3417bd9fedc4ece3acc8d48f01c46c7e) **chore:** Publish 3.x from master


### 3.5.0

* Port better timeout handling from 2.x - **[@jkrems](https://github.com/jkrems)** [#73](https://github.com/groupon/gofer/pull/73)
  - [`cdf0f37`](https://github.com/groupon/gofer/commit/cdf0f37170dcc8afcc59ba2751f39311b61d6521) **feat:** Port better timeout handling from 2.x


### 3.4.0

* Support searchDomain option - **[@jkrems](https://github.com/jkrems)** [#69](https://github.com/groupon/gofer/pull/69)
  - [`64396ad`](https://github.com/groupon/gofer/commit/64396ad7d611831b77a76ffca5f427f1a79f1231) **feat:** Support searchDomain option


### 3.3.0

* Bring back debug support - **[@jkrems](https://github.com/jkrems)** [#67](https://github.com/groupon/gofer/pull/67)
  - [`410fd51`](https://github.com/groupon/gofer/commit/410fd5157194149e8575580ef29c50d8d7484ce7) **feat:** Bring back debug support


### 3.2.2

* Add missing inheritance in example (3.x) - **[@jkrems](https://github.com/jkrems)** [#66](https://github.com/groupon/gofer/pull/66)
  - [`724f08a`](https://github.com/groupon/gofer/commit/724f08a1a8eb653b8498598f0816534aed557a8f) **docs:** Add missing inheritance in example


### 3.2.1

* Support isomorphic-fetch - **[@jkrems](https://github.com/jkrems)** [#63](https://github.com/groupon/gofer/pull/63)
  - [`2234a20`](https://github.com/groupon/gofer/commit/2234a2022a9971db7aa1845259dcdab32acb00b8) **fix:** Support isomorphic-fetch


### 3.2.0

* Pass meta data into native methods - **[@jkrems](https://github.com/jkrems)** [#62](https://github.com/groupon/gofer/pull/62)
  - [`109f6d1`](https://github.com/groupon/gofer/commit/109f6d107585fabbf80205f1a045e8101ed82c32) **feat:** Pass meta data into native methods
  - [`44ff043`](https://github.com/groupon/gofer/commit/44ff043fa56b50c4d378eb9c1d404eb5500e8cf8) **refactor:** Remove util dependency


### 3.1.1

* Send valid host header - **[@jkrems](https://github.com/jkrems)** [#61](https://github.com/groupon/gofer/pull/61)
  - [`154d266`](https://github.com/groupon/gofer/commit/154d266a509329528ca5ec904b2376b7e1a0cb4a) **fix:** Send valid host header


### 3.1.0

* Echo back the url in res.url - **[@jkrems](https://github.com/jkrems)** [#60](https://github.com/groupon/gofer/pull/60)
  - [`bbb0e6d`](https://github.com/groupon/gofer/commit/bbb0e6d7c0ad5c9909c7cdeb467d088ed2bec8ff) **feat:** Echo back the url in res.url


### 3.0.1

* Add v3 breaking notes - **[@jkrems](https://github.com/jkrems)** [#59](https://github.com/groupon/gofer/pull/59)
  - [`284c90a`](https://github.com/groupon/gofer/commit/284c90aa2675709a8dfc7f768cade7d74054ba59) **docs:** Add v3 breaking notes


### 3.0.0

* [`547db3b`](https://github.com/groupon/gofer/commit/547db3bb318c777d3e3e37ab13e24fdf9187d532) **feat:** Initial version of fetch
* [`57a04a4`](https://github.com/groupon/gofer/commit/57a04a4434f7406bdbb57fc444542a51f74779c1) **test:** Verify error.body
* [`b3d86ad`](https://github.com/groupon/gofer/commit/b3d86ad6ba5e7fad8cb624b41ebd5bfb8368ffae) **style:** Use _.assign over O.assign
* [`1e6e79c`](https://github.com/groupon/gofer/commit/1e6e79c902189b876446f3903f50163aa8d60a84) **refactor:** Use bluebird instead of native
* [`15f0c70`](https://github.com/groupon/gofer/commit/15f0c706e2403c6d8c6f3dd2bb4e6092deb87b98) **refactor:** Simplify agent options
* [`f76b59a`](https://github.com/groupon/gofer/commit/f76b59a0830f33143284cda0538f46d1f810422e) **refactor:** Remove random _property
* [`a639184`](https://github.com/groupon/gofer/commit/a639184e4c74531afa41505762462cbc3adaa238) **feat:** Add base class
* [`564886e`](https://github.com/groupon/gofer/commit/564886e6efb253da41dd22d49c097ad502a9b21f) **fix:** Working sub-classing
* [`ca4dbf6`](https://github.com/groupon/gofer/commit/ca4dbf671151504754e225a4b5c9491f2417d142) **docs:** Port README
* [`952ac4d`](https://github.com/groupon/gofer/commit/952ac4d63fc7e4c3a8b902edd0044a5d71e45712) **docs:** Add fetch-style example
* [`cf0e5ef`](https://github.com/groupon/gofer/commit/cf0e5ef606c77b88991b858e270b21738b16a462) **docs:** Mention fetch over request
* [`196eef9`](https://github.com/groupon/gofer/commit/196eef91b2799f8e7d16f980ff8aae690e70113a) **docs:** baseUrl is now an option
* [`04ed5ba`](https://github.com/groupon/gofer/commit/04ed5baafffa6fdaca05f80624b0d99b7eeb1d65) **feat:** Add legacy callback mode
* [`28b5a6a`](https://github.com/groupon/gofer/commit/28b5a6adf58ca46965c28e1adaa9381e6536e4a5) **feat:** Add callback support for Gofer
* [`91fe8d8`](https://github.com/groupon/gofer/commit/91fe8d885e8c5ce25ebffb82f5dc06d8e0bf3491) **style:** Use explicit lodash imports
* [`6a5e5b8`](https://github.com/groupon/gofer/commit/6a5e5b8b302700e91f53eda7fa45414d22e860e2) **feat:** Multi-level config handling
* [`69b5ccf`](https://github.com/groupon/gofer/commit/69b5ccf5a38bfe7cc146c055427b1876b458a476) **feat:** Expose Gofer as exports.default
* [`01e46bc`](https://github.com/groupon/gofer/commit/01e46bca426007e3c4b93ddd4978ac6a3080068b) **docs:** Add links to the exports
* [`ec6b138`](https://github.com/groupon/gofer/commit/ec6b138aec22fd2044bace38b21d52cd3b7fbf41) **feat:** Very basic browser support
* [`8e06e77`](https://github.com/groupon/gofer/commit/8e06e77a83d6b44ceb9bd5392fd9cb210d5dc705) **refactor:** Remove http(s) from browser build
* [`b2f3553`](https://github.com/groupon/gofer/commit/b2f3553386c6be2e287b2f133af0420f79ae6a9b) **feat:** Basics work in react-native
* [`05f88e8`](https://github.com/groupon/gofer/commit/05f88e80c154bb5ebc70a9050c3519eec71fc187) **test:** Partially working test setup in phantom
* [`c41e60a`](https://github.com/groupon/gofer/commit/c41e60afbfd37d6025d01c409dc12bcc5df0b247) **test:** Run first actual browser test
* [`fce491d`](https://github.com/groupon/gofer/commit/fce491de961e76df86c998ca14a6ff18b625c6de) **test:** Run the whole test suite in phantom
* [`fd542fa`](https://github.com/groupon/gofer/commit/fd542fad52f550ffa7feb112a90ea3900ea4c9b7) **feat:** Support status code errors in browsers
* [`4e97ac2`](https://github.com/groupon/gofer/commit/4e97ac2ebda52ff312cec4f6d74321eeefd057f2) **doc:** Update manual browser test instructions
* [`1e22002`](https://github.com/groupon/gofer/commit/1e2200233ba3adf851818f0e61db648553f8419e) **test:** Verify options.pathParams support
* [`7ecd8bc`](https://github.com/groupon/gofer/commit/7ecd8bcad8fe15d0e0efda9630e17a9e99a091f9) **test:** Legacy-compatible endpoints are possible
* [`c26613c`](https://github.com/groupon/gofer/commit/c26613c5091df4ebc511d2659ef30e5719f05bc0) **test:** Verify response body stream
* [`71e8fe4`](https://github.com/groupon/gofer/commit/71e8fe42020169758c0179109cf84757a8b90293) **feat:** Consistent header support for client-side
* [`6d55edb`](https://github.com/groupon/gofer/commit/6d55edbaecfb1ef7f217c395f154ef4fd1b4171f) **feat:** Send body as string or buffer
* [`cb1afeb`](https://github.com/groupon/gofer/commit/cb1afeb3217181faf32a8bff4233ecec9edf9cae) **test:** Add missing body & qs tests
* [`e7c4033`](https://github.com/groupon/gofer/commit/e7c40338ecb04d9d0596fae9fa83e99df8afbac0) **feat:** options.auth support
* [`47c6121`](https://github.com/groupon/gofer/commit/47c6121ca98d0f44ecad69ebcb0cdc97a39bb784) **test:** options.headers test
* [`79fd337`](https://github.com/groupon/gofer/commit/79fd337249dfc326fd5d219e159032e04c1c721b) **feat:** options.timeout
* [`5a42b47`](https://github.com/groupon/gofer/commit/5a42b4713935d3b74ec48cd2bed2ff2007724e41) **feat:** options.connectTimeout
* [`8c84f46`](https://github.com/groupon/gofer/commit/8c84f4699e59534510250d2c604d8d2cc23ca2e3) **fix:** Verify path params - see: [#50](https://github.com/groupon/gofer/issues/50)
* [`4ed4471`](https://github.com/groupon/gofer/commit/4ed4471e929cd0b9d8b076636b246a32bf84906d) **test:** Stream request body
* [`fda4930`](https://github.com/groupon/gofer/commit/fda493037286dc3ddf45fc8044c0f2301427994c) **feat:** https url support
* [`bc217a0`](https://github.com/groupon/gofer/commit/bc217a08dd2ee6009ce2ecc2bc1d7c5b0a097feb) **feat:** Use per-service http agent
* [`c1ed538`](https://github.com/groupon/gofer/commit/c1ed53894529f75b64412c9c8a5099e86655fd00) **feat:** Support form-data as an option mapper
* [`054f9e6`](https://github.com/groupon/gofer/commit/054f9e69243c72fcfd7fe55f17ba0a56c30cd342) **doc:** Port old API docs
* [`33ddfcb`](https://github.com/groupon/gofer/commit/33ddfcb303ec624295bc12e57f75258f2dd536ee) **docs:** Add example github API client
* [`3d5efa7`](https://github.com/groupon/gofer/commit/3d5efa7303403a12a7b6d0eff7bb2783a810c92a) **style:** Remove invalid TODO
* [`8a9fe01`](https://github.com/groupon/gofer/commit/8a9fe01b5f7ce2a096209d6cd70ecff2284dd6f6) **feat:** Expose method and url on status code error
* [`ce3bde4`](https://github.com/groupon/gofer/commit/ce3bde4bfb029cdadf7f47543d1cbe26ceb79a8c) **chore:** Add nlm beta channel
