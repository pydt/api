import { Game } from '../models';
import { userRepository } from '../dynamoose/userRepository';
import { gameRepository } from '../dynamoose/gameRepository';
import { deleteDiscourseGameTopic } from '../discourse';
import * as _ from 'lodash';
import * as AWS from 'aws-sdk';
const ses = new AWS.SES();

export async function deleteGame(game: Game, steamId: string) {
  const users = await userRepository.getUsersForGame(game);
  const promises = [];

  promises.push(gameRepository.delete(game.gameId));

  for (const curUser of users) {
    _.pull(curUser.activeGameIds, game.gameId);
    promises.push(userRepository.saveVersioned(curUser));

    if (curUser.emailAddress && (!steamId || curUser.steamId !== steamId)) {
      let message = `<p>A game that you have recently joined (<b>${game.displayName}</b>) has been deleted`;

      if (!steamId) {
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

  promises.push(deleteDiscourseGameTopic(game));

  await Promise.all(promises);
}
