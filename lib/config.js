'use strict';

require('dotenv').config();

module.exports = {
  SERVERLESS_STAGE: process.env.SERVERLESS_STAGE,
  RESOURCE_PREFIX: process.env.RESOURCE_PREFIX,
  WEB_URL: process.env.WEB_URL
};
