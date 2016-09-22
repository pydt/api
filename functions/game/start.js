'use strict';

const Game = require('../../lib/dynamoose/Game.js');
const User = require('../../lib/dynamoose/User.js');

module.exports.handler = (event, context, cb) => {
  const gameId = event.path.gameId;
  let game;

  Game.get({ gameId: gameId }).then(_game => {
    game = _game;
    if (game.inProgress) {
      throw new Error('Game in Progress');
    }

    if (game.createdBySteamId !== event.principalId) {
      throw new Error('You didn\'t create this Game!');
    }

    game.inProgress = true;
    return Game.saveVersioned(game);
  })
  .then(() => {
    return cb(null, game);
  })
  .catch(err => {
    cb(err);
  });
};
