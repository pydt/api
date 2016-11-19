'use strict';

const common = require('../../../lib/common.js');
const discourse = require('../../../lib/discourse.js');
const Game = require('../../../lib/dynamoose/Game.js');
const User = require('../../../lib/dynamoose/User.js');
const uuid = require('node-uuid');


module.exports.handler = (event, context, cb) => {
  try {
    const newGame = new Game({
      gameId: uuid.v4(),
      createdBySteamId: event.principalId,
      currentPlayerSteamId: event.principalId,
      players: [{
        steamId: event.principalId
      }],
      displayName: event.body.displayName
    });

    discourse.addGameTopic(newGame).then(topic => {
      if (topic) {
        newGame.discourseTopicId = topic.topic_id;
      }

      return Game.saveVersioned(newGame);
    }).then(() => {
      return User.get(event.principalId);
    }).then(user => {
      user.activeGameIds = user.activeGameIds || [];
      user.activeGameIds.push(newGame.gameId);
      return User.saveVersioned(user);
    }).then(() => {
      cb(null, newGame);
    }).catch(err => {
      common.generalError(cb, err);
    });
  } catch (err) {
    common.generalError(cb, err);
  }
};
