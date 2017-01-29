'use strict';

const _ = require('lodash');
const moment = require('moment');
const common = require('../../lib/common.js');
const Game = require('../../lib/dynamoose/Game.js');
const gameDelete = require('../http/game/delete.js');

module.exports.handler = (event, context, cb) => {
  Game
    .scan('inProgress').not().eq(true)
    .where('createdAt').lt(moment().add(-30, 'days').valueOf())
    .exec()
    .then(games => {
      return Promise.all(_.map(games, game => {
        console.log(`deleted game ${game.gameId}`);
        return gameDelete.deleteGame(game);
      }));
    })
    .catch(err => {
      common.generalError(cb, err);
    });
};