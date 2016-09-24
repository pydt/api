'use strict';

const config = require('../config.js');
const s3 = new require('aws-sdk').S3();
const Game = require('../../lib/dynamoose/Game.js');
const GameTurn = require('../../lib/dynamoose/GameTurn.js');

module.exports.handler = (event, context, cb) => {
  const gameId = event.path.gameId;

  Game.get(gameId).then(game => {
    if (game.currentPlayerSteamId !== event.principalId) {
      throw new Error('It\'s not your turn!');
    }

  	return s3.getSignedUrl('putObject', {
      Bucket: config.RESOURCE_PREFIX + 'saves',
      Key: GameTurn.createS3SaveKey(gameId, game.submittedTurnCount + 1),
      Expires: 60,
      ContentType: 'application/octet-stream'
    });
  })
  .catch(err => {
    cb(err);
  });
};
