'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
const User = require('../../../lib/dynamoose/User.js');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  const gameId = event.path.gameId;
  let game;

  Game.get({ gameId: gameId }).then(_game => {
    game = _game;
    if (game.inProgress) {
      throw new Error('[500] Game in Progress');
    }

    if (_.map(game.players, 'steamId').indexOf(event.principalId) >= 0) {
      throw new Error('[500] Player already in Game');
    }

    if (_.map(game.players, 'civType').indexOf(event.body.playerCiv) >= 0) {
      throw new Error('[500] Civ already in Game');
    }

    if (game.players.length >= game.humans) {
      throw new Error('[500] Too many humans already in game.');
    }

    game.players.push({
      steamId: event.principalId,
      civType: event.body.playerCiv
    });

    return Game.saveVersioned(game);
  })
  .then(() => {
    return User.get(event.principalId);
  }).then(user => {
    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds.push(game.gameId);
    return User.saveVersioned(user);
  }).then(() => {
    return cb(null, game);
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};
