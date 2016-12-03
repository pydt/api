'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
const User = require('../../../lib/dynamoose/User.js');
const _ = require('lodash');
const AWS = require('aws-sdk');
const ses = new AWS.SES();

module.exports.handler = (event, context, cb) => {
  const gameId = event.path.gameId;
  let game;
  let joinedUser;

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
    joinedUser = user;
    return User.saveVersioned(user);
  }).then(() => {
    return User.get(game.createdBySteamId);
  }).then(createdByUser => {
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
    
  }).then(() => {
    return cb(null, game);
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};
