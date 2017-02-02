'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
const bcrypt = require('bcryptjs');

module.exports.handler = (event, context, cb) => {
  const body = JSON.parse(event.body);
  const gameId = event.pathParameters.gameId;
  const userId = event.requestContext.authorizer.principalId;
  let game;

  Game.get(gameId).then(_game => {
    game = _game;

    if (game.inProgress) {
      throw new common.PydtError(`Game in Progress`);
    }

    if (game.createdBySteamId !== userId) {
      throw new common.PydtError(`You didn't create this game!`);
    }

    if (game.slots < game.players.length) {
      throw new common.PydtError(`You can't change the number of slots to less than the current number of players!`);
    }

    if (game.humans < game.players.length) {
      throw new common.PydtError(`You can't change the number of humans to less than the current number of players!`);
    }

    game.displayName = body.displayName;
    game.description = body.description;
    game.slots = body.slots;
    game.dlc = body.dlc;
    game.humans = body.humans;
    game.gameSpeed = body.gameSpeed;
    game.mapFile = body.mapFile;
    game.mapSize = body.mapSize;

    if (body.password) {
      if (body.password !== game.hashedPassword) {
        return bcrypt.genSalt(10)
          .then(function(salt) {
            return bcrypt.hash(body.password, salt);
          })
          .then(hashed => {
            game.hashedPassword = hashed;
          });
      }
    } else {
      game.hashedPassword = null;
    }
  })
  .then(() => {
    return Game.saveVersioned(game);
  })
  .then(() => {
    common.lp.success(event, cb, game);
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};