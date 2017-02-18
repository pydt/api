'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
const GameTurn = require('../../../lib/dynamoose/GameTurn.js');
const User = require('../../../lib/dynamoose/User.js');
const _ = require('lodash');
const AWS = require('aws-sdk');
const ses = new AWS.SES();
const bcrypt = require('bcryptjs');

module.exports.handler = (event, context, cb) => {
  const body = JSON.parse(event.body);
  const gameId = event.pathParameters.gameId;
  const userId = event.requestContext.authorizer.principalId;

  let game;
  let targetPlayer;
  let joinedUser;

  Game.get({ gameId: gameId }).then(_game => {
    game = _game;
    if (game.inProgress) {
      if (!game.allowJoinAfterStart) {
        throw new common.PydtError('Game does not allow joining after start!');
      }
      
      targetPlayer = _.find(game.players, player => {
        return player.civType === body.playerCiv;
      });

      if (!targetPlayer) {
        throw new common.PydtError('Requested civ not found.');
      }

      if (targetPlayer.steamId) {
        throw new common.PydtError('Slot already assigned.');
      }
    } else {
      if (body.playerCiv != 'LEADER_RANDOM' && _.map(game.players, 'civType').indexOf(body.playerCiv) >= 0) {
        throw new common.PydtError('Civ already in Game');
      }
    }

    if (_.map(game.players, 'steamId').indexOf(userId) >= 0) {
      throw new common.PydtError('Player already in Game');
    }

    if (Game.getHumans(game).length >= game.humans) {
      throw new common.PydtError('Too many humans already in game.');
    }

    if (game.hashedPassword) {
      return bcrypt.compare(body.password || '', game.hashedPassword).then(res => {
        if (!res) {
          throw new common.PydtError('Supplied password does not match game password!');
        }
      });
    }
  })
  .then(() => {
    if (targetPlayer) {
      targetPlayer.steamId = userId;
    } else {
      game.players.push({
        steamId: userId,
        civType: body.playerCiv
      });
    }

    return User.get(userId);
  })
  .then(user => {
    if (!user.emailAddress) {
      throw new common.PydtError('You need to set an email address for notifications before joining a game.');
    }

    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds.push(game.gameId);
    joinedUser = user;

    return Promise.all([
      Game.saveVersioned(game),
      User.saveVersioned(user)
    ]);
  })
  .then(() => {
    return User.getUsersForGame(game);
  })
  .then(users => {
    const createdByUser = _.find(users, user => {
      return user.steamId === game.createdBySteamId;
    });

    const promises = [];

    if (createdByUser.emailAddress) {
      const email = {
        Destination: {
          ToAddresses: [
            createdByUser.emailAddress
          ]
        },
        Message: {
          Body: {
            Html: {
              Data: `<p>The user <b>${joinedUser.displayName}</b> has joined your game <b>${game.displayName}</b>!  There are now <b>${Game.getHumans(game, true).length} / ${game.humans}</b> human player slots filled in the game.</p>`
            }
          }, Subject: {
            Data: 'A new user has joined your game!'
          }
        },
        Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
      };

      promises.push(ses.sendEmail(email).promise());
    }

    if (game.inProgress) {
      promises.push(GameTurn.getAndUpdateSaveFileForGameState(game, users));
    }

    return Promise.all(promises);
  })
  .then(() => {
    common.lp.success(event, cb, game);
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};
