'use strict';

const common = require('../common.js');
const dynamoose = require('./common.js');
const uuid = require('node-uuid');
const civ6 = require('civ6-save-parser');
const pwdgen = require('generate-password');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const _ = require('lodash');

const GameTurn = dynamoose.createVersionedModel(common.config.RESOURCE_PREFIX + 'game-turn', {
  gameId: {
    type: String,
    hashKey: true
  },
  turn: {
    type: Number,
    rangeKey: true
  },
  round: {
    type: Number,
    required: true
  },
  playerSteamId: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: function() {
      return new Date();
    }
  },
  endDate: Date,
  skipped: Boolean
});

GameTurn.createS3SaveKey = (gameId, turn) => {
  return gameId + "/" + ("000000" + turn).slice(-6) + ".CivXSave";
};

GameTurn.getAndUpdateSaveFileForGameState = (game, users) => {
  const s3Key = GameTurn.createS3SaveKey(game.gameId, game.gameTurnRangeKey);

  return s3.getObject({
    Bucket: common.config.RESOURCE_PREFIX + 'saves',
    Key: s3Key
  }).promise()
  .then(data => {
    if (!data && !data.Body) {
      throw new Error(`File doesn't exist: ${s3Key}`);
    }

    return GameTurn.updateSaveFileForGameState(game, users, GameTurn.parseSaveFile(data.Body));
  });
};

GameTurn.updateTurnStatistics = (game, gameTurn, user, undo) => {
  undo = undo ? -1 : 1;

  if (gameTurn.endDate) {
    const player = _.find(game.players, player => {
      return player.steamId === user.steamId;
    });

    if (gameTurn.skipped) {
      player.turnsSkipped = (player.turnsSkipped || 0) + 1 * undo;
      user.turnsSkipped = (user.turnsSkipped || 0) + 1 * undo;
    } else {
      player.turnsPlayed = (player.turnsPlayed || 0) + 1 * undo;
      user.turnsPlayed = (user.turnsPlayed || 0) + 1 * undo;
    }
    
    const timeTaken = gameTurn.endDate.getTime() - gameTurn.startDate.getTime();
    player.timeTaken = (player.timeTaken || 0) + timeTaken * undo;
    user.timeTaken = (user.timeTaken || 0) + timeTaken * undo;

    if (timeTaken < 1000 * 60 * 60) {
      user.fastTurns = (user.fastTurns || 0) + 1 * undo;
      player.fastTurns = (player.fastTurns || 0) + 1 * undo;
    }

    if (timeTaken > 1000 * 60 * 60 * 6) {
      user.slowTurns = (user.slowTurns || 0) + 1 * undo;
      player.slowTurns = (player.slowTurns || 0) + 1 * undo;
    }
  }
};

GameTurn.updateSaveFileForGameState = (game, users, wrapper) => {
  const parsed = wrapper.parsed;

  for (let i = parsed.CIVS.length - 1; i >= 0; i--) {
    const parsedCiv = parsed.CIVS[i];

    if (game.players[i]) {
      const player = game.players[i];

      if (player.hasSurrendered) {
        // Make sure surrendered players are marked as AI
        if (parsedCiv.ACTOR_AI_HUMAN.data === 3) {
          civ6.modifyChunk(wrapper.chunks, parsedCiv.ACTOR_AI_HUMAN, 1);
        }
      } else {
        if (users) {
          // Make sure player names are correct
          if (parsedCiv.PLAYER_NAME.data != users[i].displayName) {
            civ6.modifyChunk(wrapper.chunks, parsedCiv.PLAYER_NAME, users[i].displayName);
          }
        }

        if (player.steamId === game.currentPlayerSteamId) {
          // Delete any password for the active player
          if (parsedCiv.PLAYER_PASSWORD) {
            civ6.deleteChunk(wrapper.chunks, parsedCiv.PLAYER_PASSWORD);
            civ6.modifyChunk(wrapper.chunks, parsedCiv.SLOT_HEADER, parsedCiv.SLOT_HEADER.data - 1);
          }
        } else {
          // Make sure all other players have a random password
          if (!parsedCiv.PLAYER_PASSWORD) {
            civ6.addChunk(wrapper.chunks, parsedCiv.PLAYER_NAME, civ6.MARKERS.ACTOR_DATA.PLAYER_PASSWORD, civ6.DATA_TYPES.STRING, pwdgen.generate({}));
            civ6.modifyChunk(wrapper.chunks, parsedCiv.SLOT_HEADER, parsedCiv.SLOT_HEADER.data + 1);
          } else {
            civ6.modifyChunk(wrapper.chunks, parsedCiv.PLAYER_PASSWORD, pwdgen.generate({}));
          }
        }

        // TODO: Revisit this code when human->ai->human works
        /*// Reset all players to human...
        if (parsedCiv.data.ACTOR_AI_HUMAN.data === 1) {
          needSave = true;
          buffer = civ6.modifyCiv(buffer, parsedCiv, { ACTOR_AI_HUMAN: 3 });
        }*/
      }
    } 
  }

  return s3.putObject({
    Bucket: common.config.RESOURCE_PREFIX + 'saves',
    Key: GameTurn.createS3SaveKey(game.gameId, game.gameTurnRangeKey),
    Body: Buffer.concat(wrapper.chunks)
  }).promise();
};

GameTurn.parseSaveFile = buffer => {
  try {
    return civ6.parse(buffer);
  } catch (e) {
    throw new common.PydtError(`Could not parse uploaded file!  If you continue to have trouble please post on the PYDT forums.`, true);
  }
}

module.exports = GameTurn;
