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

    if (game.playerSteamIds.indexOf(event.principalId) >= 0) {
      throw new Error('Player already in Game');
    }

    game.playerSteamIds.push(event.principalId);
    return Game.saveVersioned(game);
  })
  .then(() => {
    return User.get(event.principalId);
  }).then(user => {
    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds.push(game.gameId);
    return User.saveVersioned(user);
  }).then(() => {
    return cb(null, game);
  })
  .catch(err => {
    cb(err);
  });
};
