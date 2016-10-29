'use strict';

global.Promise = require("bluebird");
global.Promise.config({
  longStackTraces: true
});

require('dotenv').config();

const rollbar = require('rollbar');

rollbar.handleUncaughtExceptionsAndRejections("***REMOVED***", {
  environment: process.env.SERVERLESS_STAGE,
  exitOnUncaughtException: true
});

module.exports = {
  config: {
    SERVERLESS_STAGE: process.env.SERVERLESS_STAGE,
    RESOURCE_PREFIX: process.env.RESOURCE_PREFIX,
    WEB_URL: process.env.WEB_URL
  },
  generalError: (cb, error) => {
    rollbar.handleError(error, () => {
      cb(new Error('[500] Sorry!'));
    });
  }
};
