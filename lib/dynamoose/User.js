'use strict';

const config = require('../config.js');
const dynamoose = require('dynamoose');

module.exports = dynamoose.model(config.TABLE_PREFIX + 'user',
  new dynamoose.Schema({
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
  }, {
    timestamps: true
  })
);
