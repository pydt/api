'use strict';

const common = require('../../lib/common.js');
const User = require('../../lib/dynamoose/User.js');

module.exports.handler = (event, context, cb) => {
  User.get(event.principalId).then(user => {
    return cb(null, user);
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};
