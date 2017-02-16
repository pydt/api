'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  const gameId = event.path.gameId;

  Game.scan('completed').not().eq(true).exec().then(games => {
    const orderedGames = _.orderBy(games, ['createdAt'], ['desc']);
    common.lp.success(event, cb, {
      notStarted: _.filter(orderedGames, game => {
        return !game.inProgress;
      }),
      openSlots: _.filter(orderedGames, game => {
        const numHumans = _.filter(game.players, player => {
          return player.steamId;
        }).length;

        return game.inProgress && !game.completed && numHumans < game.players.length && numHumans < game.humans;
      })
    });
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};
