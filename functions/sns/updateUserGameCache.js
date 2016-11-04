'use strict';

const _ = require('lodash');
const common = require('../../lib/common.js');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const Game = require('../../lib/dynamoose/Game.js');
const User = require('../../lib/dynamoose/User.js');

module.exports.handler = (event, context, cb) => {
  const gameId = event.Records[0].Sns.Message;
  let game;

  Game.get(gameId).then(_game => {
    game = _game

    if (!game || !game.inProgress) {
      return null;
    }

    return User.batchGet(_.map(game.players, 'steamId'));
  })
  .then(users => {
    if (!users || !users.length) {
      return cb(null);
    }

    return updateUsers(users).then(() => {
      cb(null);
    });
  })
  .catch(err => {
    cb(err);
  });
};

function updateUsers(users) {
  const gameIds = _.uniq(_.concat(_.flatMap(users, 'activeGameIds')));

  return Game.batchGet(gameIds).then(games => {
    return Promise.all(_.map(users, user => {
      return updateUser(user, games);
    }));
  });
}

function updateUser(user, games) {
  const result = _.filter(games, game => {
    return _.includes(user.activeGameIds, game.gameId);
  });

  return new Promise((resolve, reject) => {
    s3.putObject({
      Bucket: common.config.RESOURCE_PREFIX + 'saves',
      Key: User.createS3GameCacheKey(user.steamId),
      ACL: 'public-read',
      CacheControl: 'no-cache',
      Body: JSON.stringify(result)
    }, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
