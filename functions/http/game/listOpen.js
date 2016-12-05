'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  const gameId = event.path.gameId;

  Game.scan('inProgress').not().eq(true).exec().then(games => {
    common.lp.success(event, cb, _.orderBy(games, ['createdAt'], ['desc']));
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};
