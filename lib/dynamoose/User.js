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
  avatarSmall: String,
  avatarMedium: String,
  avatarFull: String,
  emailAddress: String,
  activeGameIds: [String],
  inactiveGameIds: [String],
  turnsPlayed: {
    type: Number,
    default: 0
  },
  turnsSkipped: {
    type: Number,
    default: 0
  },
  timeTaken: {
    type: Number,
    default: 0
  },
  fastTurns: {
    type: Number,
    default: 0
  },
  slowTurns: {
    type: Number,
    default: 0
  }
});

User.createS3GameCacheKey = (steamId) => {
  return steamId + '/' + 'gameCache.json';
};

User.getUsersForGame = game => {
  const steamIds = _.compact(_.map(game.players, 'steamId'));
  return User.batchGet(steamIds).then(users => {
    // make sure they're sorted correctly...
    const playersWithSteamIds = _.filter(game.players, player => {
      return !!player.steamId;
    });

    return _.map(playersWithSteamIds, player => {
      return _.find(users, user => {
        return user.steamId === player.steamId;
      });
    });
  });
};

module.exports = User;
