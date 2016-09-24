'use strict';

const config = require('../config.js');
const dynamoose = require('./common.js');
const uuid = require('node-uuid');

const GameTurn = dynamoose.createVersionedModel(config.RESOURCE_PREFIX + 'game-turn', {
  gameId: {
    type: String,
    hashKey: true
  },
  turn: {
    type: Number,
    rangeKey: true
  },
  playerSteamId: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: function() {
      return new Date();
    }
  },
  endDate: Date,
  skipped: Boolean
});

GameTurn.createS3SaveKey = (gameId, turn) => {
  return gameId + "/" + ("000000" + turn).slice(-6) + ".Civ5Save";
}

module.exports = GameTurn;
