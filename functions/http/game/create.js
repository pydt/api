'use strict';

const common = require('../../../lib/common.js');
const discourse = require('../../../lib/discourse.js');
const Game = require('../../../lib/dynamoose/Game.js');
const User = require('../../../lib/dynamoose/User.js');
const uuid = require('node-uuid');
const bcrypt = require('bcryptjs');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  const body = JSON.parse(event.body);
  const userId = event.requestContext.authorizer.principalId;

  let user;

  User.get(userId).then(_user => {
    user = _user;

    if (!user.emailAddress) {
      throw new common.PydtError('You need to set a notification email address before you can create a game.');
    }

    return Game.getGamesForUser(user);
  }).then(games => {
    let hasCreatedGame = _.some(games, game => {
      return game.createdBySteamId === userId;
    });

    if (hasCreatedGame) {
      throw new common.PydtError('User has already created a game.');
    } else {
      return createTheGame(user, body, cb);
    }
  }) 
  .then(game => {
    common.lp.success(event, cb, game);
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};

//////

function createTheGame(user, body) {
  const newGame = new Game({
    gameId: uuid.v4(),
    createdBySteamId: user.steamId,
    currentPlayerSteamId: user.steamId,
    dlc: body.dlc,
    players: [{
      steamId: user.steamId,
      civType: body.player1Civ
    }],
    displayName: body.displayName,
    description: body.description,
    slots: body.slots,
    humans: body.humans
  });

  return discourse.addGameTopic(newGame).then(topic => {
    if (topic) {
      newGame.discourseTopicId = topic.topic_id;
    }

    if (body.password) {
      return bcrypt.genSalt(10)
        .then(function(salt) {
          return bcrypt.hash(body.password, salt);
        })
        .then(hashed => {
          newGame.hashedPassword = hashed;
        });
    }
  })
  .then(() => {
    return Game.saveVersioned(newGame);
  })
  .then(() => {
    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds.push(newGame.gameId);
    return User.saveVersioned(user);
  })
  .then(() => {
    return newGame;
  });
}
