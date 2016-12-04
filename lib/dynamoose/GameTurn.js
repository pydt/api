'use strict';

const common = require('../common.js');
const dynamoose = require('./common.js');
const uuid = require('node-uuid');
const civ6 = require('civ6-save-parser');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

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

    let buffer = data.Body;
    return GameTurn.updateSaveFileForGameState(game, users, buffer);
  });
};

GameTurn.updateSaveFileForGameState = (game, users, buffer, parsed) => {
  let needSave = false;

  if (!parsed) {
    parsed = GameTurn.parseSaveFile(buffer);
  }

  for (let i = parsed.CIVS.length - 1; i >= 0; i--) {
    const parsedCiv = parsed.CIVS[i];

    if (game.players[i]) {
      const player = game.players[i];

      if (player.hasSurrendered) {
        if (parsedCiv.data.ACTOR_AI_HUMAN.data === 3) {
          needSave = true;
          buffer = civ6.modifyCiv(buffer, parsedCiv, { ACTOR_AI_HUMAN: 1 });
        }
      } else {
        if (users) {
          if (parsedCiv.data.PLAYER_NAME.data != users[i].displayName) {
            needSave = true;
            buffer = civ6.modifyCiv(buffer, parsedCiv, { PLAYER_NAME: users[i].displayName });
            // Inefficent, but until we get a better way to do multiple edits in one session it's necessary. :(
            parsed = civ6.parse(buffer);
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

  let savePromise = Promise.resolve();

  if (needSave) {
    savePromise = s3.putObject({
      Bucket: common.config.RESOURCE_PREFIX + 'saves',
      Key: GameTurn.createS3SaveKey(game.gameId, game.gameTurnRangeKey),
      Body: buffer
    }).promise();
  }

  return savePromise;
};

GameTurn.parseSaveFile = buffer => {
  try {
    return civ6.parse(buffer);
  } catch (e) {
    throw new common.CivxError(`Could not parse uploaded file.`);
  }
}

module.exports = GameTurn;
