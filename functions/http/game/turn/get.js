'use strict';

const common = require('../../../../lib/common.js');
const Game = require('../../../../lib/dynamoose/Game.js');
const GameTurn = require('../../../../lib/dynamoose/GameTurn.js');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  const gameId = event.pathParameters.gameId;

  Game.get(gameId).then(game => {
    if (game.currentPlayerSteamId !== event.requestContext.authorizer.principalId) {
      throw new Error('It\'s not your turn!');
    }

    let file = GameTurn.createS3SaveKey(gameId, game.gameTurnRangeKey);

    const fileParams = {
      Bucket: common.config.RESOURCE_PREFIX + 'saves',
      Key: file
    };

    if (event.queryStringParameters && event.queryStringParameters.compressed) {
      fileParams.Key += ".gz";

      return s3.headObject(fileParams).promise()
        .then(() => {
          return fileParams;
        })
        .catch(err => {
          // Compressed file doesn't exist, fallback to uncompressed!
          fileParams.Key = file;
          return fileParams;
        });
    }

    return fileParams;
  })
  .then(params => {
    common.lp.success(event, cb, {
      downloadUrl: s3.getSignedUrl('getObject', _.merge(params, {
        ResponseContentDisposition: 'attachment; filename="(PYDT) Play This One!.Civ6Save"',
        Expires: 60
      }))
    });
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};
