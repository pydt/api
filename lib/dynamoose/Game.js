'use strict';

const common = require('../common.js');
const dynamoose = require('./common.js');
const _ = require('lodash');

const Game = dynamoose.createVersionedModel(common.config.RESOURCE_PREFIX + 'game', {
  gameId: {
    type: String,
    hashKey: true,
    required: true
  },
  createdBySteamId: {
    type: String,
    required: true
  },
  inProgress: Boolean,
  displayName: {
    type: String,
    required: true
  },
  description: String,
  slots: Number,
  humans: Number,
  players: [
    {
      steamId: String,
      civType: String
    }
  ],
  discourseTopicId: Number,
  currentPlayerSteamId: {
    type: String,
    required: true
  },
  turnTimerMinutes: Number,
  gameTurnInGame: {
    type: Number,
    required: true,
    default: 1
  },
  gameTurnRangeKey: {
    type: Number,
    required: true,
    default: 1
  }
});

Game.getGamesForUser = user => {
  const gameKeys = _.map(user.activeGameIds || [], gameId => {
    return { gameId: gameId }
  });

  if (gameKeys.length > 0) {
    return Game.batchGet(gameKeys);
  } else {
    return Promise.resolve([]);
  }
};

module.exports = Game;
