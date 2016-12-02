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
  generalError: (cb, error, message) => {
    rollbar.handleError(error, () => {
      cb(new Error(message || '[500] Sorry!'));
    });
  },
  CivxError: function(message, logError) {
    this.name = 'CivxError';
    this.message = message || '';
    this.logError = !!logError;
  },
  lp: {
    success: (event, cb, data, statusCode) => {
      cb(null, createLpResponse(event, statusCode || 200, data));
    },
    error: (event, cb, error, message) => {
      if (!message) {
        if (error instanceof module.exports.CivxError) {
          message = error.message;
        } else {
          message = 'Sorry!';
        }
      }

      if (error instanceof module.exports.CivxError && !error.logError) {
        // Don't send CivxErrors to rollbar unless explicitly asked
        cb(null, createLpResponse(event, 500, { errorMessage: message }));
      } else {
        rollbar.handleError(error, () => {
          cb(null, createLpResponse(event, 500, { errorMessage: message }));
        });
      }
    }
  } 
};

///////

module.exports.CivxError.prototype = Error.prototype;

function createLpResponse(event, statusCode, body) {
  const origin = event.headers.Origin;
  let allowOrigin = "https://www.playyourdamnturn.com";

  if (origin === "http://localhost:8080") {
    allowOrigin = origin;
  }

  return {
    statusCode: statusCode,
    headers: {
      "Access-Control-Allow-Origin" : allowOrigin
    },
    body: JSON.stringify(body || {})
  };
}
