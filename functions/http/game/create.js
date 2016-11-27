'use strict';

const common = require('../../../lib/common.js');
const discourse = require('../../../lib/discourse.js');
const Game = require('../../../lib/dynamoose/Game.js');
const User = require('../../../lib/dynamoose/User.js');
const uuid = require('node-uuid');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  let user;

  try {
    User.get(event.principalId).then(_user => {
      user = _user;
      return Game.getGamesForUser(user);
    }).then(games => {
      let hasCreatedGame = _.some(games, game => {
        return game.createdBySteamId === event.principalId;
      });

      if (hasCreatedGame) {
        cb(new Error('[500] User has already created a game.'));
      } else {
        return createTheGame(user, event.body, cb);
      }
    }).catch(err => {
      common.generalError(cb, err);
    });
  } catch (err) {
    common.generalError(cb, err);
  }
};

//////

function createTheGame(user, eventBody, cb) {
  const newGame = new Game({
    gameId: uuid.v4(),
    createdBySteamId: user.steamId,
    currentPlayerSteamId: user.steamId,
    players: [{
      steamId: user.steamId,
      civType: eventBody.player1Civ
    }],
    displayName: eventBody.displayName,
    description: eventBody.description,
    slots: eventBody.slots,
    humans: eventBody.humans
  });

  return discourse.addGameTopic(newGame).then(topic => {
    if (topic) {
      newGame.discourseTopicId = topic.topic_id;
    }

    return Game.saveVersioned(newGame);
  }).then(() => {
    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds.push(newGame.gameId);
    return User.saveVersioned(user);
  }).then(() => {
    cb(null, newGame);
  });
}
