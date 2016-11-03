'use strict';

const common = require('../../../lib/common.js');
const User = require('../../../lib/dynamoose/User.js');
const Game = require('../../../lib/dynamoose/Game.js');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  User.get(event.principalId).then(user => {
    let gameKeys = _.chain(user.activeGameIds || [])
      .map(gameId => {
        return { gameId: gameId }
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
    common.generalError(cb, err);
  });
};
