'use strict';

const common = require('../../lib/common.js');
const Game = require('../../lib/dynamoose/Game.js');

module.exports.handler = (event, context, cb) => {
  const gameId = event.path.gameId;

  Game.get({ gameId: gameId }).then(game => {
    return cb(null, game);
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};
