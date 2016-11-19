'use strict';

const common = require('../common.js');
const dynamoose = require('./common.js');

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

module.exports = Game;
