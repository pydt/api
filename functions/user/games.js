'use strict';

const User = require('../../lib/dynamoose/User.js');
const Game = require('../../lib/dynamoose/Game.js');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  console.log(event.principalId);

  User.get(event.principalId).then(user => {
    console.log(user);
    let gameKeys = _.chain(user.games || [])
      .filter(game => {
        return !game.endDate;
      })
      .map(game => {
        return { gameId: game.gameId }
      })
      .value();

    if (gameKeys.length > 0) {
      return Game.batchGet(gameKeys);
    } else {
      return [];
    }
  }).then(games => {
    cb(null, games);
  }).catch(err => {
    cb(err);
  });
};
