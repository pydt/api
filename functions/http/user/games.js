'use strict';

const common = require('../../../lib/common.js');
const User = require('../../../lib/dynamoose/User.js');
const Game = require('../../../lib/dynamoose/Game.js');

module.exports.handler = (event, context, cb) => {
  User.get(event.principalId).then(user => {
    return Game.getGamesForUser(user);
  }).then(games => {
    common.lp.success(event, cb, {
      data: games,
      pollUrl: 'https://' + common.config.RESOURCE_PREFIX + 'saves.s3.amazonaws.com/' + User.createS3GameCacheKey(event.principalId)
    });
  }).catch(err => {
    common.lp.error(event, cb, err);
  });
};
