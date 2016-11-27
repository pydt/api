'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
const GameTurn = require('../../../lib/dynamoose/GameTurn.js');

module.exports.handler = (event, context, cb) => {
  const gameId = event.path.gameId;
  let game;

  Game.get(gameId).then(_game => {
    game = _game;
    if (game.inProgress) {
      throw new Error('[500] Game in progress!');
    }

    if (game.createdBySteamId !== event.principalId) {
      throw new Error('[500] You didn\'t create this game!');
    }

    if (game.players.length < 2) {
      throw new Error('[500] Not enough players to start the game!');
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
