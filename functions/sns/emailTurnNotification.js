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
    game = _game;

    return User.get(game.currentPlayerSteamId);
  })
  .then(user => {
    if (!user.emailAddress) {
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
            Data: '<h1>PLAY YOUR DAMN TURN</h1>'
          }
        }, Subject: {
          Data: '[Ripoff] It\'s your turn in ' + game.displayName + '!'
        }
      },
      Source: 'noreply@sacknet.org'
    };

    ses.sendEmail(email, (err, data) => {
      cb(err, data);
    });
  })
  .catch(err => {
    cb(err);
  });
};
