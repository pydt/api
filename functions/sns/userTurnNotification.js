'use strict';

const common = require('../../lib/common.js');
const AWS = require('aws-sdk');
const Game = require('../../lib/dynamoose/Game.js');
const User = require('../../lib/dynamoose/User.js');
const ses = new AWS.SES();
const iotData = new AWS.IotData({endpoint: 'a21s639tnrshxf.iot.us-east-1.amazonaws.com'});

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
    return Promise.all([
      notifyUserClient(user),
      sendEmail(user, game)
    ]);
  })
  .then(() => {
    cb();
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};

function notifyUserClient(user) {
  return iotData.publish({
    topic: `/pydt/${process.env.SERVERLESS_STAGE}/user/${user.steamId}/gameupdate`,
    payload: "Hello!",
    qos: 0
  }).promise();
}

function sendEmail(user, game) {
  if (!user || !user.emailAddress) {
    return;
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
          Data: `<h1>PLAY YOUR DAMN TURN</h1><p>Game URL: ${common.config.WEB_URL}/game/${game.gameId}</p>`
        }
      }, Subject: {
        Data: `PLAY YOUR DAMN TURN in ${game.displayName} (Round ${game.round})`
      }
    },
    Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
  };

  return ses.sendEmail(email).promise();
}
