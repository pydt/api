'use strict';

const _ = require('lodash');
const moment = require('moment');
const common = require('../../lib/common.js');
const Game = require('../../lib/dynamoose/Game.js');
const User = require('../../lib/dynamoose/User.js');
const AWS = require('aws-sdk');
const ses = new AWS.SES();
const gameDelete = require('../http/game/delete.js');

module.exports.handler = (event, context, cb) => {
  deleteOldUnstartedGames()
  .then(() => {
    return notifyGamesAboutToBeDeleted();
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};

function deleteOldUnstartedGames() {
  return Game
    .scan('inProgress').not().eq(true)
    .where('createdAt').lt(moment().add(-30, 'days').valueOf())
    .exec()
    .then(games => {
      return Promise.all(_.map(games, game => {
        console.log(`deleted game ${game.gameId}`);
        return gameDelete.deleteGame(game);
      }));
    });
}

function notifyGamesAboutToBeDeleted() {
  return Game
    .scan('inProgress').not().eq(true)
    .where('createdAt').lt(moment().add(-25, 'days').valueOf())
    .exec()
    .then(games => {
      return Promise.all(_.map(games, game => {
        var expirationDate = moment(game.createdAt).add(30, 'days').format('MMMM Do');

        return User.get(game.createdBySteamId).then(user => {
          const email = {
            Destination: {
              ToAddresses: [
                user.emailAddress
              ]
            },
            Message: {
              Body: {
                Html: {
                  Data: `<p>A game that you have created but not started (<b>${game.displayName}</b>) is scheduled to be deleted if you don't start it before <b>${expirationDate}</b>.  Please come start it before then!</p><p>Game URL: ${common.config.WEB_URL}/game/${game.gameId}</p>`
                }
              }, Subject: {
                Data: `Game Scheduled for Deletion`
              }
            },
            Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
          };

          return ses.sendEmail(email).promise();
        });
      }));
    });
}