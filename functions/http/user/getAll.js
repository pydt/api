'use strict';

const common = require('../../../lib/common.js');
const User = require('../../../lib/dynamoose/User.js');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  getAllUsers().then(users => {
    common.lp.success(event, cb, users);
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};

//////

function getAllUsers(lastKey) {
  const scan = User.scan().where('turnsPlayed').gt(0);
  
  if (lastKey) {
    scan = scan.startAt(lastKey);
  }

  return scan.exec().then(users => {
    if (users.lastKey) {
      return getAllUsers(users.lastKey).then(moreUsers => {
        return users.concat(moreUsers);
      });
    }

    return users;
  });
}