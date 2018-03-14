import { Game, User } from '../models';
import { provideSingleton, inject } from '../ioc';
import { USER_REPOSITORY_SYMBOL, IUserRepository } from '../dynamoose/userRepository';
import * as _ from 'lodash';

export const USER_SERVICE_SYMBOL = Symbol('IUserService');

export interface IUserService {
  createS3GameCacheKey(steamId: string): string;
  getUsersForGame(game: Game): Promise<User[]>;
}

@provideSingleton(USER_SERVICE_SYMBOL)
export class UserService implements IUserService {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository
  ) {
  }

  public createS3GameCacheKey(steamId: string): string {
    return steamId + '/' + 'gameCache.json';
  };

  public getUsersForGame(game: Game): Promise<User[]> {
    const steamIds = _.compact(_.map(game.players, 'steamId'));
    return this.userRepository.batchGet(steamIds).then(users => {
      // make sure they're sorted correctly...
      const playersWithSteamIds = _.filter(game.players, player => {
        return !!player.steamId;
      });

      return _.map(playersWithSteamIds, player => {
        return _.find(users, user => {
          return user.steamId === player.steamId;
        });
      });
    });
  };
}
