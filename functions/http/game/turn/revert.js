'use strict';

const common = require('../../../../lib/common.js');
const sns = require('../../../../lib/sns.js');
const User = require('../../../../lib/dynamoose/User.js');
const Game = require('../../../../lib/dynamoose/Game.js');
const GameTurn = require('../../../../lib/dynamoose/GameTurn.js');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  const gameId = event.path.gameId;
  let game, lastTurn;

  Game.get(gameId).then(_game => {
    game = _game;

    if (game.currentPlayerSteamId !== event.principalId && game.createdBySteamId !== event.principalId) {
      throw new Error(`You can't revert this game!`);
    }

    return findGameTurnToRevertTo(game, game.gameTurnRangeKey - 1);
  })
  .then(_lastTurn => {
    lastTurn = _lastTurn;
    return User.get(lastTurn.playerSteamId);
  })
  .then(user => {
    GameTurn.updateTurnStatistics(game, lastTurn, user, true);

    // Update previous turn data
    delete lastTurn.skipped;
    delete lastTurn.endDate;
    lastTurn.startDate = new Date();

    const promises = [];

    // Delete turns between the old turn and the turn to revert to
    for (let i = lastTurn.turn + 1; i <= game.gameTurnRangeKey; i++) {
      console.log(`deleting ${gameId}/${i}`);
      promises.push(GameTurn.delete({gameId: gameId, turn: i}));
    }

    // Update game record
    const curPlayerIndex = Game.getCurrentPlayerIndex(game);
    const prevPlayerIndex = Game.getPreviousPlayerIndex(game);

    if (prevPlayerIndex >= curPlayerIndex) {
      game.round--;
    }

    game.currentPlayerSteamId = game.players[prevPlayerIndex].steamId;
    game.gameTurnRangeKey = lastTurn.turn;
    
    promises.push(GameTurn.saveVersioned(lastTurn));
    promises.push(Game.saveVersioned(game));
    promises.push(User.saveVersioned(user));
    promises.push(GameTurn.getAndUpdateSaveFileForGameState(game));

    return Promise.all(promises);
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

//////

function findGameTurnToRevertTo(game, turn) {
  return GameTurn.get({gameId: game.gameId, turn: turn}).then(gameTurn => {
    const player = _.find(game.players, player => {
      return player.steamId === gameTurn.playerSteamId;
    });
    
    if (player.hasSurrendered) {
      return findGameTurnToRevertTo(game, turn - 1);
    } else {
      return gameTurn;
    }
  }); 
}