import { Config } from '../config';
import { provideSingleton } from '../ioc';
import { BaseDynamooseRepository, IRepository } from './common';
import { PrivateUserData, Game, WebPushSubscription } from '../models';
import { legacyBoolean, legacyStringSet } from '../util/dynamooseLegacy';

export const PRIVATE_USER_DATA_REPOSITORY_SYMBOL = Symbol('IPrivateUserDataRepository');

export interface IPrivateUserDataRepository extends IRepository<string, PrivateUserData> {
  getUserDataForGame(game: Game): Promise<PrivateUserData[]>;
}

@provideSingleton(PRIVATE_USER_DATA_REPOSITORY_SYMBOL)
export class PrivateUserDataRepository
  extends BaseDynamooseRepository<string, PrivateUserData>
  implements IPrivateUserDataRepository
{
  constructor() {
    super(Config.resourcePrefix + 'private-user-data', {
      steamId: {
        type: String,
        hashKey: true
      },
      websocketConnectionIds: legacyStringSet(),
      emailAddress: String,
      newTurnEmails: legacyBoolean(),
      webhookUrl: String,
      /* webPushSubscriptions: {
        type: Array,
        schema: {
          endpoint: String,
          keys: {
            p256dh: String,
            auth: String
          }
        }
      } */
      webPushSubscriptions: {
        // Legacy complex array, see above
        type: String,
        get: (value: string) => (value ? JSON.parse(value) : []),
        pydtSet: (value: WebPushSubscription[]) => JSON.stringify(value || [])
      }
    });
  }

  async get(id: string, consistent?: boolean) {
    let result = await super.get(id, consistent);

    if (!result) {
      result = {
        steamId: id
      };
    }

    if (result.newTurnEmails === null || result.newTurnEmails === undefined) {
      result.newTurnEmails = true;
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
