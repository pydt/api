'use strict';

const common = require('../../lib/common.js');
const AWS = require('aws-sdk');
const Game = require('../../lib/dynamoose/Game.js');
const User = require('../../lib/dynamoose/User.js');
const ses = new AWS.SES();

module.exports.handler = (event, context, cb) => {
  const gameId = event.Records[0].Sns.Message;
  let game;

  Game.get(gameId).then(_game => {
    game = _game

    if (!game || !game.inProgress || game.completed) {
      return null;
    }

    return User.get(game.currentPlayerSteamId);
  })
  .then(user => {
    if (!user || !user.emailAddress) {
      return cb(null);
    }

    const email = {
      Destination: {
        ToAddresses: [
          user.emailAddress
        ]
      },
      Message: {
        Body: {
          Html: {
            Data: `<h1>PLAY YOUR DAMN TURN</h1><p>Game URL: ${common.config.WEB_URL}/game/${gameId}</p>`
          }
        }, Subject: {
          Data: `PLAY YOUR DAMN TURN in ${game.displayName} (Round ${game.round})`
        }
      },
      Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
    };

    ses.sendEmail(email, (err, data) => {
      cb(err, data);
    });
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};
