'use strict';

const common = require('../../lib/common.js');
const Game = require('../../lib/dynamoose/Game.js');
const GameTurn = require('../../lib/dynamoose/GameTurn.js');
const User = require('../../lib/dynamoose/User.js');
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  const userId = event.Records[0].Sns.Message;
  let promise;

  if (userId) {
    promise = User.get(userId).then(user => {
      return [user];
    });
  } else {
    promise = User.scan().exec();
  }

  promise.then(users => {
    return calculateUserStats(users);
  })
  .then(() => {
    cb(null);
  })
  .catch(err => {
    cb(err);
  });

  ////////

  function calculateUserStats(users) {
    const curUser = _.head(users);
    
    if (!curUser) {
      return;
    }

    resetStatistics(curUser);

    const allGameIds = _.concat(curUser.activeGameIds || [], curUser.inactiveGameIds || []);
    let games;
    
    console.log(`Processing user ${curUser.displayName}`);

    if (!allGameIds.length) {
      return calculateUserStats(_.tail(users));
    }
    
    return Game.batchGet(allGameIds)
      .then(_games => {
        games = _games;
        return calculateGameStats(games, curUser);
      })
      .then(() => {
        return User.saveVersioned(curUser);
      })
      .then(() => {
        return calculateUserStats(_.tail(users));
      });
  }

  function calculateGameStats(games, user) {
    const curGame = _.head(games);
    const player = _.find(curGame.players, player => {
      return player.steamId === user.steamId;
    });

    resetStatistics(player);

    return GameTurn.query('gameId').eq(curGame.gameId).filter('playerSteamId').eq(user.steamId).exec()
      .then(turns => {
        for(let turn of turns) {
          GameTurn.updateTurnStatistics(curGame, turn, user);
        }

        return Game.saveVersioned(curGame);
      })
      .then(() => {
        if (_.tail(games).length) {
          return calculateGameStats(_.tail(games), user);
        }
      });
  }

  function resetStatistics(host) {
    host.turnsPlayed = 0;
    host.turnsSkipped = 0;
    host.timeTaken = 0;
  }
};
