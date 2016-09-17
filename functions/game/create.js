'use strict';

const Game = require('../../lib/dynamoose/Game.js');
const User = require('../../lib/dynamoose/User.js');

module.exports.handler = (event, context, cb) => {
  try {
    const newGame = new Game({
      createdBySteamId: event.principalId,
      currentPlayerSteamId: event.principalId,
      playerSteamIds: [event.principalId],
      displayName: event.body.displayName
    });

    Game.saveVersioned(newGame).then(() => {
      return User.get(event.principalId);
    }).then(user => {
      user.activeGameIds = user.activeGameIds || [];
      user.activeGameIds.push(newGame.gameId);
      return User.saveVersioned(user);
    }).then(() => {
      cb(null, newGame);
    }).catch(err => {
      cb(err);
    });
  } catch (err) {
    cb(err);
  }
};
