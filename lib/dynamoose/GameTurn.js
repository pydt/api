'use strict';

const config = require('../config.js');
const dynamoose = require('../common.js');
const uuid = require('node-uuid');

const GameTurn = dynamoose.createVersionedModel(config.RESOURCE_PREFIX + 'game-turn', {
  gameId: {
    type: Buffer,
    hashKey: true
  },
  turnId: {
    type: Buffer,
    rangeKey: true
    default: () => {
      return uuid.v1();
    }
  },
  playerSteamId: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  skipped: Boolean
});

module.exports = GameTurn;
