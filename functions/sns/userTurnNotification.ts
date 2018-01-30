import { gameRepository } from '../../lib/dynamoose/gameRepository';
import { userRepository } from '../../lib/dynamoose/userRepository';
import { loggingHandler } from '../../lib/logging';
import { User, Game } from '../../lib/models/index';
import { Config } from '../../lib/config';
import { sendEmail } from '../../lib/email/ses';
import * as AWS from 'aws-sdk';
const iotData = new AWS.IotData({endpoint: 'a21s639tnrshxf.iot.us-east-1.amazonaws.com'});

export const handler = loggingHandler(async (event, context) => {
  const gameId = event.Records[0].Sns.Message;
  const game = await gameRepository.get(gameId);

  if (!game || !game.inProgress || game.completed) {
    return;
  }

  const user = await userRepository.get(game.currentPlayerSteamId);

  await notifyUserClient(user);

  if (user.emailAddress) {
    await sendEmail(
      `PLAY YOUR DAMN TURN in ${game.displayName} (Round ${game.round})`,
      'PLAY YOUR DAMN TURN!',
      `It's your turn in ${game.displayName}.  You should be able to play your turn in the client, or go here to download the save file: ${Config.webUrl()}/game/${game.gameId}`,
      user.emailAddress
    );
  }
});

function notifyUserClient(user: User) {
  return iotData.publish({
    topic: `/pydt/${process.env.SERVERLESS_STAGE}/user/${user.steamId}/gameupdate`,
    payload: "Hello!",
    qos: 0
  }).promise();
}
