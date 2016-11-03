'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
const GameTurn = require('../../../lib/dynamoose/GameTurn.js');

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
    const firstTurn = new GameTurn({
      gameId: game.gameId,
      turn: 1,
      playerSteamId: game.createdBySteamId
    });

    return GameTurn.saveVersioned(firstTurn);
  })
  .then(() => {
    return cb(null, game);
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};
