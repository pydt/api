'use strict';

const common = require('../../../../lib/common.js');
const sns = require('../../../../lib/sns.js');
const Game = require('../../../../lib/dynamoose/Game.js');
const GameTurn = require('../../../../lib/dynamoose/GameTurn.js');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const _ = require('lodash');
const civ6 = require('civ6-save-parser');

module.exports.handler = (event, context, cb) => {
  const gameId = event.path.gameId;
  let game;

  Game.get(gameId).then(_game => {
    game = _game;
    if (game.currentPlayerSteamId !== event.principalId) {
      throw new Error('It\'s not your turn!');
    }

    return new Promise((resolve, reject) => {
      s3.getObject({
        Bucket: common.config.RESOURCE_PREFIX + 'saves',
        Key: GameTurn.createS3SaveKey(gameId, game.gameTurnRangeKey + 1)
      }, (err, data) => {
        if (err) {
          reject(err);
        }

        resolve(data);
      });
    });
  })
  .then(data => {
    if (!data && !data.Body) {
      throw new Error('File doesn\'t exist?');
    }

    let buffer = data.Body;
    const parsed = civ6.parse(buffer);
    const numCivs = parsed.CIVS.length;
    const gameTurn = parsed.GAME_TURN.data;

    if (numCivs !== game.players.length) {
      return cb(new Error('[500] Invalid number of civs in save file! (actual: ' + numCivs + ', expected: ' + game.players.length + ')'));
    }

    const expectedGameTurn = Math.floor(game.gameTurnRangeKey / game.players.length) + 1;

    if (expectedGameTurn != gameTurn) {
      return cb(new Error('[500] Incorrect game turn in save file! (actual: ' + gameTurn + ', expected: ' + expectedGameTurn + ')'));
    }

    const isCurrentTurn = parsed.CIVS[game.gameTurnRangeKey % game.players.length].data.IS_CURRENT_TURN;

    if (!isCurrentTurn || !isCurrentTurn.data) {
      return cb(new Error('[500] Incorrect player turn in save file!'));
    }

    // Reset all players to human...
    let needSave = false;

    for (let civ of parsed.CIVS) {
      if (civ.data.ACTOR_AI_HUMAN.data === 1) {
        needSave = true;
        buffer = civ6.modifyCiv(buffer, civ, { ACTOR_AI_HUMAN: 3 });
      }
    }

    let savePromise = Promise.resolve();

    if (needSave) {
      savePromise = s3.putObject({
        Bucket: common.config.RESOURCE_PREFIX + 'saves',
        Key: GameTurn.createS3SaveKey(gameId, game.gameTurnRangeKey + 1),
        Body: buffer
      }).promise();
    }

    return savePromise.then(() => {
      return module.exports.moveToNextTurn(game, cb);
    });
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};

////////

module.exports.moveToNextTurn = (game, cb) => {
  return Promise.all([
    closeGameTurn(game),
    createNextGameTurn(game)
  ])
  .then(() => {
    // Finally, update the game itself!
    game.currentPlayerSteamId = getNextPlayerSteamId(game);
    game.gameTurnRangeKey++;
    return Game.saveVersioned(game);
  })
  .then(() => {
    // Send an sns message that a turn has been completed.
    return sns.sendMessage(common.config.RESOURCE_PREFIX + 'turn-submitted', 'turn-submitted', game.gameId);
  })
  .then(() => {
    cb(null, game);
  });
}

function closeGameTurn(game) {
  return GameTurn.get({ gameId: game.gameId, turn: game.gameTurnRangeKey }).then(gameTurn => {
    gameTurn.endDate = new Date();
    return GameTurn.saveVersioned(gameTurn);
  });
}

function createNextGameTurn(game) {
  const nextTurn = new GameTurn({
    gameId: game.gameId,
    turn: game.gameTurnRangeKey + 1,
    playerSteamId: getNextPlayerSteamId(game)
  });

  return GameTurn.saveVersioned(nextTurn);
}

function getNextPlayerSteamId(game) {
  let playerIndex = _.indexOf(game.players, _.find(game.players, player => {
    return player.steamId === game.currentPlayerSteamId;
  })) + 1;

  if (playerIndex >= game.players.length) {
    playerIndex = 0;
  }

  return game.players[playerIndex].steamId;
}
