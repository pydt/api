import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../lib/email/sesProvider';
import { DISCOURSE_PROVIDER_SYMBOL, IDiscourseProvider } from '../discourseProvider';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../dynamoose/userRepository';
import { inject, provideSingleton } from '../ioc';
import { Game } from '../models';
import { UserUtil } from '../util/userUtil';

export const GAME_SERVICE_SYMBOL = Symbol('IGameService');

export interface IGameService {
  deleteGame(game: Game, steamId: string): Promise<void>;
}

@provideSingleton(GAME_SERVICE_SYMBOL)
export class GameService implements IGameService {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider,
    @inject(DISCOURSE_PROVIDER_SYMBOL) private discourse: IDiscourseProvider
  ) {}

  public async deleteGame(game: Game, steamId: string) {
    const users = await this.userRepository.getUsersForGame(game);
    const promises = [];

    promises.push(this.gameRepository.delete(game.gameId));

    for (const curUser of users) {
      UserUtil.removeUserFromGame(curUser, game, false);
      promises.push(this.userRepository.saveVersioned(curUser));

      if (curUser.emailAddress && (!steamId || curUser.steamId !== steamId)) {
        let message = `A game that you have recently joined (<b>${game.displayName}</b>) has been deleted`;

        if (!steamId) {
          message += ` because it took too long to start. :(`;
        } else {
          message += ` by it's creator. :(`;
        }

        promises.push(this.ses.sendEmail('Game Deleted', 'Game Deleted', message, curUser.emailAddress));
      }
    }

    promises.push(this.discourse.deleteGameTopic(game));

    await Promise.all(promises);
  }
}
