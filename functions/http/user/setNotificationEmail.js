'use strict';

const common = require('../../../lib/common.js');
const User = require('../../../lib/dynamoose/User.js');

module.exports.handler = (event, context, cb) => {
  User.get(event.principalId).then(user => {
    user.emailAddress = event.body.emailAddress;
    return User.saveVersioned(user);
  })
  .then(user => {
    common.lp.success(event, cb, user);
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};
