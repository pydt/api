'use strict';

const common = require('../../../lib/common.js');
const jwt = require('../../auth/jwt.js');
const director = require('director');

module.exports.handler = (event, context, callback) => {
  const router = new director.Router();

  router.on('get', '/user/steamProfile', function() {
    if (jwt.manualValidation(event, context, callback)) {
      require('./steamProfile').handler(event, context, callback);
    }
  });

  router.on('get', '/user/steamProfiles', function() {
    require('./steamProfiles').handler(event, context, callback);
  });

  router.on('get', '/user/games', function() {
    if (jwt.manualValidation(event, context, callback)) {
      require('./games.js').handler(event, context, callback);
    }
  });

  router.on('get', '/user/getCurrent', function() {
    if (jwt.manualValidation(event, context, callback)) {
      require('./getCurrent.js').handler(event, context, callback);
    }
  });

  router.on('post', '/user/setNotificationEmail', function() {
    if (jwt.manualValidation(event, context, callback)) {
      require('./setNotificationEmail').handler(event, context, callback);
    }
  });

  router.on('get', '/user/:userId', function() {
    event.pathParameters.userId = event.pathParameters.proxy;
    require('./getById.js').handler(event, context, callback);
  });

  router.configure({
    notfound: () => {
      common.lp.success(event, callback, {message: 'Not Found'}, 404);
    },
    strict: false
  });

  if (event.httpMethod.toLowerCase() === 'options') {
    return common.lp.success(event, callback, {}, 200);
  }

  if (typeof event.body === 'string' && event.body.length) {
    event.body = JSON.parse(event.body);
  }

  console.log('dispatching ', event.httpMethod.toLowerCase(), event.path);

  router.dispatch(event.httpMethod.toLowerCase(), event.path, () => {
    common.lp.error(event, callback, 'Routing failed?');
  });
};