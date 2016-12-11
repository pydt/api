'use strict';

global.Promise = require("bluebird");
global.Promise.config({
  longStackTraces: true
});

if (process.env.ROLLBAR_API_KEY) {
  const rollbar = require('rollbar');

  rollbar.handleUncaughtExceptionsAndRejections(process.env.ROLLBAR_API_KEY, {
    environment: process.env.SERVERLESS_STAGE,
    exitOnUncaughtException: true
  });
}

function PydtError(message, logError) {
    this.name = 'PydtError';
    this.message = message || '';
    this.logError = !!logError;

    const err = Error(message); // http://es5.github.io/#x15.11.1
    this.stack = err.stack;
}

PydtError.prototype = Object.create(Error.prototype);
PydtError.prototype.constructor = PydtError;

module.exports = {
  config: {
    SERVERLESS_STAGE: process.env.SERVERLESS_STAGE,
    RESOURCE_PREFIX: process.env.RESOURCE_PREFIX,
    WEB_URL: process.env.WEB_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    DISCOURSE_API_KEY: process.env.DISCOURSE_API_KEY,
    STEAM_API_KEY: process.env.STEAM_API_KEY
  },
  generalError: (cb, error, message) => {
    if (rollbar) {
      rollbar.handleError(error, () => {
        cb(new Error(message || '[500] Sorry!'));
      });
    } else {
      cb(new Error(message || '[500] Sorry!'));
    }
  },
  PydtError: PydtError,
  lp: {
    success: (event, cb, data, statusCode) => {
      cb(null, createLpResponse(event, statusCode || 200, data));
    },
    error: (event, cb, error, message) => {
      const errorBody = {};

      if (!message) {
        if (error instanceof module.exports.PydtError) {
          message = error.message;
        }
      }

      if (message) {
        errorBody.errorMessage = message;
      }

      if (!rollbar || (error instanceof PydtError && !error.logError)) {
        // Don't send PydtErrors to rollbar unless explicitly asked
        cb(null, createLpResponse(event, 500, errorBody));
      } else {
        rollbar.handleError(error, () => {
          cb(null, createLpResponse(event, 500, errorBody));
        });
      }
    }
  } 
};

///////

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
