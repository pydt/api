'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  const body = JSON.parse(event.body);
  const gameId = event.pathParameters.gameId;
  let game;

  Game.get(gameId).then(_game => {
    game = _game;
    if (game.inProgress) {
      throw new common.PydtError('Game in Progress');
    }
    
    if (_.map(game.players, 'civType').indexOf(body.playerCiv) >= 0) {
      throw new common.PydtError('Civ already in Game');
    }

    const player = _.find(game.players, player => {
      return player.steamId === event.requestContext.authorizer.principalId;
    });

    if (!player) {
      throw new common.PydtError('Player not in Game');
    }

    player.civType = body.playerCiv;

    return Game.saveVersioned(game);
  })
  .then(() => {
    common.lp.success(event, cb, game);
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};
