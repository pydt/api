'use strict';

const common = require('../../../../lib/common.js');
const sns = require('../../../../lib/sns.js');
const Game = require('../../../../lib/dynamoose/Game.js');
const GameTurn = require('../../../../lib/dynamoose/GameTurn.js');
const User = require('../../../../lib/dynamoose/User.js');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const _ = require('lodash');
const civ6 = require('civ6-save-parser');

module.exports.handler = (event, context, cb) => {
  const gameId = event.pathParameters.gameId;
  const userId = event.requestContext.authorizer.principalId;
  
  let game;
  let gameTurn;
  let users;

  Game.get(gameId).then(_game => {
    game = _game;
    if (game.currentPlayerSteamId !== userId) {
      throw new Error('It\'s not your turn!');
    }

    return GameTurn.get({ gameId: game.gameId, turn: game.gameTurnRangeKey });
  })
  .then(_gameTurn => {
    game.gameTurnRangeKey++;
    gameTurn = _gameTurn;
    return User.getUsersForGame(game);
  })
  .then(_users => {
    users = _users;

    return s3.getObject({
      Bucket: common.config.RESOURCE_PREFIX + 'saves',
      Key: GameTurn.createS3SaveKey(gameId, game.gameTurnRangeKey)
    }).promise();
  })
  .then(data => {
    if (!data && !data.Body) {
      throw new Error('File doesn\'t exist?');
    }

    let buffer = data.Body;
    let parsed = GameTurn.parseSaveFile(buffer);
    
    const numCivs = parsed.CIVS.length;
    const parsedRound = parsed.GAME_TURN.data;

    if (numCivs !== game.slots) {
      throw new common.CivxError(`Invalid number of civs in save file! (actual: ${numCivs}, expected: ${game.slots})`);
    }

    for (let i = parsed.CIVS.length - 1; i >= 0; i--) {
      const parsedCiv = parsed.CIVS[i].data;

      if (game.players[i]) {
        const actualCiv = parsedCiv.LEADER_NAME.data;
        const expectedCiv = game.players[i].civType; 
        if (actualCiv !== expectedCiv) {
          throw new common.CivxError(`Incorrect civ type in save file! (actual: ${actualCiv}, expected: ${expectedCiv})`);
        }

        if (!game.players[i].hasSurrendered && parsedCiv.ACTOR_AI_HUMAN === 1) {
          throw new common.CivxError(`Expected civ ${i} to be human!`);
        }

        if (game.players[i].hasSurrendered && parsedCiv.ACTOR_AI_HUMAN === 3) {
          throw new common.CivxError(`Expected civ ${i} to be AI!`);
        }
      } else {
        if (parsedCiv.ACTOR_AI_HUMAN === 3) {
          throw new common.CivxError(`Expected civ ${i} to be AI!`);
        }
      }
    }

    let expectedRound = gameTurn.round;
    let nextPlayerIndex = Game.getNextPlayerIndex(game);

    if (nextPlayerIndex <= Game.getCurrentPlayerIndex(game)) {
      expectedRound++;
    }

    if (expectedRound != parsedRound) {
      throw new common.CivxError(`Incorrect game turn in save file! (actual: ${parsedRound}, expected: ${expectedRound})`);
    }

    const isCurrentTurn = parsed.CIVS[nextPlayerIndex].data.IS_CURRENT_TURN;

    if (!isCurrentTurn || !isCurrentTurn.data) {
      throw new common.CivxError('Incorrect player turn in save file!');
    }

    return GameTurn.updateSaveFileForGameState(game, users, buffer, parsed).then(() => {
      return module.exports.moveToNextTurn(game, gameTurn, expectedRound);  
    }).then(() => {
      common.lp.success(event, cb, game);
    });
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};

////////

module.exports.moveToNextTurn = (game, gameTurn, nextRound) => {
  return Promise.all([
    closeGameTurn(gameTurn),
    createNextGameTurn(game, nextRound)
  ])
  .then(() => {
    // Finally, update the game itself!
    game.currentPlayerSteamId = game.players[Game.getNextPlayerIndex(game)].steamId;
    game.round = nextRound;
    return Game.saveVersioned(game);
  })
  .then(() => {
    // Send an sns message that a turn has been completed.
    return sns.sendMessage(common.config.RESOURCE_PREFIX + 'turn-submitted', 'turn-submitted', game.gameId);
  });
}

function closeGameTurn(gameTurn) {
  gameTurn.endDate = new Date();
  return GameTurn.saveVersioned(gameTurn);
}

function createNextGameTurn(game, nextRound) {
  const nextTurn = new GameTurn({
    gameId: game.gameId,
    turn: game.gameTurnRangeKey,
    round: nextRound,
    playerSteamId: game.players[Game.getNextPlayerIndex(game)].steamId
  });

  return GameTurn.saveVersioned(nextTurn);
}