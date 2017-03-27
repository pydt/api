'use strict';

const common = require('../../../lib/common.js');
const jwt = require('../../auth/jwt.js');
const director = require('director');
let router;

module.exports.handler = (event, context, callback) => {
  if (!router) {
    router = new director.Router();

    router.on('get', '/user/steamProfile', function() {
      if (jwt.manualValidation(event, context, callback)) {
        require('./steamProfile').handler(event, context, callback);
      }
    });

    router.on('get', '/user/steamProfiles', function() {
      if (jwt.manualValidation(event, context, callback)) {
        require('./steamProfiles').handler(event, context, callback);
      }
    });

    router.on('get', '/user/games', function() {
      if (jwt.manualValidation(event, context, callback)) {
        require('./games.js').handler(event, context, callback);
      }
    });

    router.on('get', '/user/:userId', function() {
      event.pathParameters.userId = event.pathParameters.proxy;
      require('./getById.js').handler(event, context, callback);
    });

    router.on('get', '/user', function() {
      if (jwt.manualValidation(event, context, callback)) {
        require('./getCurrent.js').handler(event, context, callback);
      }
    });

    router.on('post', '/user/setNotificationEmail', function() {
      if (jwt.manualValidation(event, context, callback)) {
        require('./setNotificationEmail').handler(event, context, callback);
      }
    });

    router.configure({
      notfound: () => {
        common.lp.success(event, callback, {message: 'Not Found'}, 404);
      },
      strict: false
    });
  }

  router.dispatch(event.httpMethod.toLowerCase(), event.path, () => {
    console.log('blah');
  });
};