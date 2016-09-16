'use strict';

const config = require('../config.js');
const dynamoose = require('../common.js');

const Game = dynamoose.createVersionedModel(config.RESOURCE_PREFIX + 'game', {
  gameId: {
    type: String,
    hashKey: true,
    default: () => {

    }
  },
  playerSteamIds: {
    type: [String],
    required: true
  },
  currentPlayerSteamId: {
    type: String,
    required: true
  },
  turns: [
    {
      playerSteamId: {
        type: String,
        required: true
      },
      startDate: {
        type: Date,
        required: true
      },
      endDate: Date,
      skipped: Boolean
    }
  ]
});

module.exports = Game;
