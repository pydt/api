'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
const User = require('../../../lib/dynamoose/User.js');
const _ = require('lodash');
const AWS = require('aws-sdk');
const ses = new AWS.SES();

module.exports.handler = (event, context, cb) => {
  const gameId = event.pathParameters.gameId;
  const userId = event.requestContext.authorizer.principalId;

  let game;
  let leftUser;

  Game.get({ gameId: gameId }).then(_game => {
    game = _game;
    if (game.createdBySteamId === userId) {
      throw new common.PydtError(`You can't leave, you created the game!`);
    }

    if (game.inProgress && game.gameTurnRangeKey > 1) {
      throw new common.PydtError('You can only leave a game before it starts.');
    }

    if (_.map(game.players, 'steamId').indexOf(userId) < 0) {
      throw new common.PydtError('Player not in Game');
    }

    _.remove(game.players, player => {
      return player.steamId === userId;
    });

    return User.get(userId);
  })
  .then(user => {
    _.pull(user.activeGameIds, game.gameId);
    leftUser = user;

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
              Data: `<p>The user <b>${leftUser.displayName}</b> has left your game <b>${game.displayName}</b>.  There are now <b>${game.players.length} / ${game.humans}</b> human players in the game.</p>`
            }
          }, Subject: {
            Data: 'A user has left your game.'
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
