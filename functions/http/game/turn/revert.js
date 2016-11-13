'use strict';

const common = require('../../../../lib/common.js');
const sns = require('../../../../lib/sns.js');
const Game = require('../../../../lib/dynamoose/Game.js');
const GameTurn = require('../../../../lib/dynamoose/GameTurn.js');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  const gameId = event.path.gameId;
  let game;

  Game.get(gameId).then(_game => {
    game = _game;

    if (game.currentPlayerSteamId !== event.principalId && game.createdBySteamId !== event.principalId) {
      throw new Error('You can\'t revert this game!');
    }

    return GameTurn.get({gameId: gameId, turn: game.gameTurnRangeKey - 1});
  })
  .then(lastTurn => {
    // Update previous turn data
    delete lastTurn.skipped;
    delete lastTurn.endDate;
    lastTurn.startDate = new Date();

    // Update game record
    game.currentPlayerSteamId = getPreviousPlayerSteamId(game);
    game.gameTurnRangeKey--;

    return Promise.all([
      GameTurn.delete({gameId: gameId, turn: game.gameTurnRangeKey + 1}),
      GameTurn.saveVersioned(lastTurn),
      Game.saveVersioned(game)
    ]);
  })
  .then(() => {
    // Send an sns message that a turn has been completed.
    return sns.sendMessage(common.config.RESOURCE_PREFIX + 'turn-submitted', 'turn-submitted', game.gameId);
  })
  .then(() => {
    cb(null, game);
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};

////////

function getPreviousPlayerSteamId(game) {
  let playerIndex = _.indexOf(game.players, _.find(game.players, player => {
    return player.steamId === game.currentPlayerSteamId;
  })) - 1;

  if (playerIndex < 0) {
    playerIndex = game.players.length - 1;
  }

  return game.players[playerIndex].steamId;
}
