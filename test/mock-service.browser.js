'use strict';
var MOCK_SERVICE_PORT = 3066;
var MOCK_SERVICE_PORT_TLS = 3067;

var options = {
  baseUrl: 'http://localhost:' + MOCK_SERVICE_PORT,
  baseUrlTls: 'https://localhost:' + MOCK_SERVICE_PORT_TLS,
};
module.exports = options;
