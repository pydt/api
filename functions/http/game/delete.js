'use strict';

const common = require('../../../lib/common.js');
const discourse = require('../../../lib/discourse.js');
const Game = require('../../../lib/dynamoose/Game.js');
const User = require('../../../lib/dynamoose/User.js');
const AWS = require('aws-sdk');
const ses = new AWS.SES();
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  const gameId = event.pathParameters.gameId;
  const userId = event.requestContext.authorizer.principalId;

  Game.get(gameId).then(game => {
    if (game.createdBySteamId !== userId) {
      throw new common.PydtError('Only the creator of the game can delete the game!');
    }

    if (game.inProgress) {
      throw new common.PydtError(`Can't delete an in progress game!`);
    }

    return module.exports.deleteGame(game, userId);
  })
  .then(() => {
    common.lp.success(event, cb, {});
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};

module.exports.deleteGame = function(game, userId) {
  return User.getUsersForGame(game)
    .then(users => {
      const promises = [];

      promises.push(Game.delete(game.gameId));

      for (let curUser of users) {
        _.pull(curUser.activeGameIds, game.gameId);
        promises.push(User.saveVersioned(curUser));

        if (curUser.emailAddress && (!userId || curUser.steamId !== userId)) {
          let message = `<p>A game that you have recently joined (<b>${game.displayName}</b>) has been deleted`;

          if (!userId) {
            message = ` because it took too long to start. :(</p>`;
          } else {
            message += ` by it's creator. :(</p>`;
          }

          const email = {
            Destination: {
              ToAddresses: [
                curUser.emailAddress
              ]
            },
            Message: {
              Body: {
                Html: {
                  Data: message
                }
              }, Subject: {
                Data: `Game Deleted`
              }
            },
            Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
          };

          promises.push(ses.sendEmail(email).promise());
        }
      }

      promises.push(discourse.deleteGameTopic(game));

      return Promise.all(promises);
    });
}