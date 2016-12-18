'use strict';

const common = require('../../../lib/common.js');
const User = require('../../../lib/dynamoose/User.js');

module.exports.handler = (event, context, cb) => {
  const userId = event.pathParameters.userId;

  User.get(userId).then(user => {
    delete user.emailAddress; // make sure email address isn't returned!
    common.lp.success(event, cb, user);
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};
