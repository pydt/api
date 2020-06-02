import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../lib/email/sesProvider';
import { DISCOURSE_PROVIDER_SYMBOL, IDiscourseProvider } from '../discourseProvider';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../dynamoose/userRepository';
import { inject, provideSingleton } from '../ioc';
import { Game, User } from '../models';
import { IUserService, USER_SERVICE_SYMBOL } from './userService';
import { HttpResponseError } from '../../api/framework';

export const GAME_SERVICE_SYMBOL = Symbol('IGameService');

export interface IGameService {
  getGame(gameId: string): Promise<Game>;
  deleteGame(game: Game, steamId: string): Promise<void>;
  getGamesForUser(user: User): Promise<Game[]>;
}

@provideSingleton(GAME_SERVICE_SYMBOL)
export class GameService implements IGameService {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(USER_SERVICE_SYMBOL) private userService: IUserService,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider,
    @inject(DISCOURSE_PROVIDER_SYMBOL) private discourse: IDiscourseProvider
  ) {
  }

  public async getGame(gameId: string) {
    const game = await this.gameRepository.get(gameId);

    if (!game) {
      throw new HttpResponseError(404, 'Not Found');
    }

    return game;
  }

  public async deleteGame(game: Game, steamId: string) {
    const users = await this.userService.getUsersForGame(game);
    const promises = [];

    promises.push(this.gameRepository.delete(game.gameId));

    for (const curUser of users) {
      this.userService.removeUserFromGame(curUser, game, false);
      promises.push(this.userRepository.saveVersioned(curUser));

      if (curUser.emailAddress && (!steamId || curUser.steamId !== steamId)) {
        let message = `A game that you have recently joined (<b>${game.displayName}</b>) has been deleted`;

        if (!steamId) {
          message += ` because it took too long to start. :(`;
        } else {
          message += ` by it's creator. :(`;
        }

        promises.push(this.ses.sendEmail(
          'Game Deleted',
          'Game Deleted',
          message,
          curUser.emailAddress
        ));
      }
    }

    promises.push(this.discourse.deleteGameTopic(game));

    await Promise.all(promises);
  }

  public getGamesForUser(user: User): Promise<Game[]> {
    const gameKeys = user.activeGameIds || [];

    if (gameKeys.length > 0) {
      return this.gameRepository.batchGet(gameKeys);
    } else {
      return Promise.resolve([]);
    }
  };
}
