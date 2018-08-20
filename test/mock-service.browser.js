'use strict';

const MOCK_SERVICE_PORT = 3066;
const MOCK_SERVICE_PORT_TLS = 3067;

const options = {
  baseUrl: `http://localhost:${MOCK_SERVICE_PORT}`,
  baseUrlTls: `https://localhost:${MOCK_SERVICE_PORT_TLS}`,
};
module.exports = options;
