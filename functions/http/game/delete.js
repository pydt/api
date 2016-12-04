'use strict';

const common = require('../../../lib/common.js');
const Game = require('../../../lib/dynamoose/Game.js');
const User = require('../../../lib/dynamoose/User.js');
const AWS = require('aws-sdk');
const ses = new AWS.SES();
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  const gameId = event.pathParameters.gameId;
  const userId = event.requestContext.authorizer.principalId;
  let game;

  Game.get(gameId).then(_game => {
    game = _game;

    if (game.createdBySteamId !== userId) {
      throw new common.CivxError('Only the creator of the game can delete the game!');
    }

    if (game.inProgress) {
      throw new common.CivxError(`Can't delete an in progress game!`);
    }

    return User.getUsersForGame(game);
  })
  .then(users => {
    const promises = [];

    for (let curUser of users) {
      _.pull(curUser.activeGameIds, game.gameId);
      promises.push(User.saveVersioned(curUser));

      if (curUser.steamId !== userId) {
        const email = {
          Destination: {
            ToAddresses: [
              curUser.emailAddress
            ]
          },
          Message: {
            Body: {
              Html: {
                Data: `<p>A game that you have recently joined (<b>${game.displayName}</b>) has been deleted by it's creator. :(</p>`
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

    promises.push(Game.delete(gameId));

    return Promise.all(promises);
  })
  .then(() => {
    common.lp.success(event, cb, {});
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};