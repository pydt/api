'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
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
  let joinedUser;

  Game.get({ gameId: gameId }).then(_game => {
    game = _game;
    if (game.inProgress) {
      throw new common.PydtError('Game in Progress');
    }

    if (_.map(game.players, 'steamId').indexOf(userId) >= 0) {
      throw new common.PydtError('Player already in Game');
    }

    if (_.map(game.players, 'civType').indexOf(body.playerCiv) >= 0) {
      throw new common.PydtError('Civ already in Game');
    }

    if (game.players.length >= game.humans) {
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
    game.players.push({
      steamId: userId,
      civType: body.playerCiv
    });

    return User.get(userId);
  })
  .then(user => {
    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds.push(game.gameId);
    joinedUser = user;

    return Promise.all([
      Game.saveVersioned(game),
      User.saveVersioned(user)
    ]);
  })
  .then(() => {
    return User.get(game.createdBySteamId);
  })
  .then(createdByUser => {
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
              Data: `<p>The user <b>${joinedUser.displayName}</b> has joined your game <b>${game.displayName}</b>!  There are now <b>${game.players.length} / ${game.humans}</b> human players in the game.</p>`
            }
          }, Subject: {
            Data: 'A new user has joined your game!'
          }
        },
        Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
      };

      return ses.sendEmail(email).promise();
    } else {
      return Promise.resolve();
    }
  })
  .then(() => {
    common.lp.success(event, cb, game);
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};
