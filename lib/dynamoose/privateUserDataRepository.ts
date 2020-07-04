import { Config } from '../config';
import { provideSingleton } from '../ioc';
import { BaseDynamooseRepository, IRepository } from './common';
import { PrivateUserData, Game } from '../models';

export const PRIVATE_USER_DATA_REPOSITORY_SYMBOL = Symbol('IPrivateUserDataRepository');

export interface IPrivateUserDataRepository extends IRepository<string, PrivateUserData> {
  getUserDataForGame(game: Game): Promise<PrivateUserData[]>;
}

@provideSingleton(PRIVATE_USER_DATA_REPOSITORY_SYMBOL)
export class PrivateUserDataRepository extends BaseDynamooseRepository<string, PrivateUserData> implements IPrivateUserDataRepository {
  constructor() {
    super(Config.resourcePrefix + 'private-user-data', {
      steamId: {
        type: String,
        hashKey: true
      },
      websocketConnectionIds: [String],
      emailAddress: String,
      webhookUrl: String
    });
  }

  async get(id: string, consistent?: boolean) {
    let result = await super.get(id, consistent);

    if (!result) {
      result = {
        steamId: id
      };
    }

    return result;
  }

  public getUserDataForGame(game: Game): Promise<PrivateUserData[]> {
    const steamIds = game.players.map(x => x.steamId).filter(Boolean);
    return this.batchGet(steamIds).then(users => {
      // make sure they're sorted correctly...
      const playersWithSteamIds = game.players.filter(player => {
        return !!player.steamId;
      });

      return playersWithSteamIds.map(player => {
        return users.find(user => {
          return user.steamId === player.steamId;
        });
      });
    });
  }
}
