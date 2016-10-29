'use strict';

const common = require('../../lib/common.js');
const User = require('../../lib/dynamoose/User.js');
const steam = require('../../lib/steam.js');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  steam.getPlayerSummaries(event.principalId).then(response => {
    let players = response.response.players;

    if (players.length !== 1) {
      throw new Error('Couldn\'t get user profile');
    }

    cb(null, players[0]);
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};
