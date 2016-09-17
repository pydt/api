'use strict';

const config = require('../config.js');
const dynamoose = require('../common.js');
const uuid = require('node-uuid');

const GameTurn = dynamoose.createVersionedModel(config.RESOURCE_PREFIX + 'game-turn', {
  gameId: {
    type: String,
    hashKey: true
  },
  turnId: {
    type: String,
    rangeKey: true
    default: () => {
      // Ensure sortability (https://github.com/broofa/node-uuid/issues/75)
      return uuid.v1().replace(/^(.{8})-(.{4})-(.{4})/, '$3-$2-$1');
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
