'use strict';

const common = require('../../lib/common.js');
const User = require('../../lib/dynamoose/User.js');
const steam = require('../../lib/steam.js');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  let steamIds = _.chain(event.query.steamIds.split(',') || [])
    .map(steamId => {
      return { steamId: steamId }
    })
    .value();

  // Ensure that all requested users are in our DB...
  User.batchGet(steamIds).then(users => {
    if (steamIds.length !== users.length) {
      throw new Error('Invalid users');
    }

    return steam.getPlayerSummaries(event.query.steamIds);
  })
  .then(response => {
    cb(null, response.response.players);
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};
