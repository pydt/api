'use strict';

const config = require('../config.js');
const dynamoose = require('./common.js');
const uuid = require('node-uuid');

const Game = dynamoose.createVersionedModel(config.RESOURCE_PREFIX + 'game', {
  gameId: {
    type: Buffer,
    hashKey: true,
    default: () => {
      return uuid.v1();
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
  playerSteamIds: {
    type: [String],
    required: true
  },
  currentPlayerSteamId: {
    type: String,
    required: true
  }
});

module.exports = Game;
