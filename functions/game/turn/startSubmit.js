'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
const GameTurn = require('../../../lib/dynamoose/GameTurn.js');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports.handler = (event, context, cb) => {
  const gameId = event.path.gameId;

  Game.get(gameId).then(game => {
    if (game.currentPlayerSteamId !== event.principalId) {
      throw new Error('It\'s not your turn!');
    }

  	cb(null, {
      putUrl: s3.getSignedUrl('putObject', {
        Bucket: common.config.RESOURCE_PREFIX + 'saves',
        Key: GameTurn.createS3SaveKey(gameId, game.gameTurnRangeKey + 1),
        Expires: 60,
        ContentType: 'application/octet-stream'
      })
    });
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};
