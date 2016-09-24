'use strict';

const config = require('../config.js');
const dynamoose = require('./common.js');
const uuid = require('node-uuid');

const Game = dynamoose.createVersionedModel(config.RESOURCE_PREFIX + 'game', {
  gameId: {
    type: String,
    hashKey: true,
    default: () => {
      return uuid.v4();
    }
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
  currentPlayerSteamId: {
    type: String,
    required: true
  },
  gameTurn: {
    type: Number,
    required: true,
    default: 0
  },
  submittedTurnCount: {
    type: Number,
    required: true,
    default: 0
  }
});

module.exports = Game;
