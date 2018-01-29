import { Game } from '../models';
import { userRepository } from '../dynamoose/userRepository';
import { gameRepository } from '../dynamoose/gameRepository';
import { deleteDiscourseGameTopic } from '../discourse';
import { sendEmail } from '../../lib/email/ses';
import * as _ from 'lodash';

export async function deleteGame(game: Game, steamId: string) {
  const users = await userRepository.getUsersForGame(game);
  const promises = [];

  promises.push(gameRepository.delete(game.gameId));

  for (const curUser of users) {
    _.pull(curUser.activeGameIds, game.gameId);
    promises.push(userRepository.saveVersioned(curUser));

    if (curUser.emailAddress && (!steamId || curUser.steamId !== steamId)) {
      let message = `A game that you have recently joined (<b>${game.displayName}</b>) has been deleted`;

      if (!steamId) {
        message = ` because it took too long to start. :(`;
      } else {
        message += ` by it's creator. :(`;
      }

      promises.push(sendEmail(
        'Game Deleted',
        'Game Deleted',
        message,
        curUser.emailAddress
      ));
    }
  }

  promises.push(deleteDiscourseGameTopic(game));

  await Promise.all(promises);
}
