'use strict';

const common = require('../common.js');
const dynamoose = require('./common.js');
const _ = require('lodash');

const User = dynamoose.createVersionedModel(common.config.RESOURCE_PREFIX + 'user', {
  steamId: {
    type: String,
    hashKey: true
  },
  displayName: {
    type: String,
    required: true
  },
  emailAddress: String,
  activeGameIds: [String],
  inactiveGameIds: [String]
});

User.createS3GameCacheKey = (steamId) => {
  return steamId + '/' + 'gameCache.json';
};

User.getUsersForGame = game => {
  const steamIds = _.map(game.players, 'steamId');
  return User.batchGet(steamIds).then(users => {
    // make sure they're sorted correctly...
   return _.map(game.players, player => {
      return _.find(users, user => {
        return user.steamId === player.steamId;
      });
    });
  });
};

module.exports = User;
