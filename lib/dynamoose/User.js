'use strict';

const config = require('../config.js');
const dynamoose = require('./common.js');

const User = dynamoose.createVersionedModel(config.RESOURCE_PREFIX + 'user', {
  steamId: {
    type: String,
    hashKey: true
  },
  displayName: {
    type: String,
    required: true
  },
  games: [
    {
      gameId: {
        type: String,
        required: true
      },
      startDate: {
        type: Date,
        required: true
      },
      endDate: Date
    }
  ]
});

module.exports = User;
