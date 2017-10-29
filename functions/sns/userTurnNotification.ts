import { gameRepository } from '../../lib/dynamoose/gameRepository';
import { userRepository } from '../../lib/dynamoose/userRepository';
import * as winston from 'winston';
import * as AWS from 'aws-sdk';
import { User, Game } from '../../lib/models/index';
import { Config } from '../../lib/config';
const ses = new AWS.SES();
const iotData = new AWS.IotData({endpoint: 'a21s639tnrshxf.iot.us-east-1.amazonaws.com'});

export async function handler(event, context, cb) {
  try {
    const gameId = event.Records[0].Sns.Message;
    const game = await gameRepository.get(gameId);
  
    if (!game || !game.inProgress || game.completed) {
      return cb();
    }
  
    const user = await userRepository.get(game.currentPlayerSteamId);
  
    await Promise.all([
      notifyUserClient(user),
      sendEmail(user, game)
    ]);

    cb();
  } catch (err) {
    winston.error(err);
    cb(err);
  }
};

function notifyUserClient(user: User) {
  return iotData.publish({
    topic: `/pydt/${process.env.SERVERLESS_STAGE}/user/${user.steamId}/gameupdate`,
    payload: "Hello!",
    qos: 0
  }).promise();
}

function sendEmail(user: User, game: Game) {
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
          Data: `<h1>PLAY YOUR DAMN TURN</h1><p>Game URL: ${Config.webUrl()}/game/${game.gameId}</p>`
        }
      }, Subject: {
        Data: `PLAY YOUR DAMN TURN in ${game.displayName} (Round ${game.round})`
      }
    },
    Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
  };

  return ses.sendEmail(email).promise();
}
