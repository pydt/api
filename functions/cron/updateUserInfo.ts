import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { getPlayerSummaries } from '../../lib/steamUtil';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import { User } from '../../lib/models/user';
import { inject } from '../../lib/ioc';
import { injectable } from 'inversify';
import { chunk, shuffle } from 'lodash';
import { SteamProfile } from '../../lib/models';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const uui = iocContainer.resolve(UpdateUserInfo);
  await uui.execute();
});

@injectable()
export class UpdateUserInfo {
  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {}

  public async execute(): Promise<void> {
    const allUsers = shuffle(await this.userRepository.allUsers());
    const usersToUpdate: User[] = [];
    let loadedCount = 0;

    for (const curChunk of chunk(allUsers, 75)) {
      let players: SteamProfile[] = [];

      try {
        players = await getPlayerSummaries(curChunk.map(x => x.steamId));
      } catch (e) {
        pydtLogger.error('Error loading users from steam...', e);
        // Exit loop and update any successful users
        break;
      }

      loadedCount += players.length;

      pydtLogger.info(`Loaded ${loadedCount} users from steam...`);

      for (const user of curChunk) {
        const curPlayer = players.find(player => {
          return user.steamId === player.steamid;
        });

        if (curPlayer) {
          const isDirty =
            this.possiblyUpdateValue(user, 'displayName', curPlayer.personaname) ||
            this.possiblyUpdateValue(user, 'steamProfileUrl', curPlayer.profileurl) ||
            this.possiblyUpdateValue(user, 'avatarSmall', curPlayer.avatar) ||
            this.possiblyUpdateValue(user, 'avatarMedium', curPlayer.avatarmedium) ||
            this.possiblyUpdateValue(user, 'avatarFull', curPlayer.avatarfull);

          if (isDirty) {
            usersToUpdate.push(user);
          }
        } else {
          pydtLogger.info(`Couldn't find steamId ${user.steamId}!`);
        }
      }

      // Try not to get steam mad at us
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    pydtLogger.info(`${usersToUpdate.length} users to update...`);

    for (const curChunk of chunk(usersToUpdate, 75)) {
      for (const user of curChunk) {
        pydtLogger.info(`Updating ${user.steamId} (${user.displayName})...`);
        await this.userRepository.saveVersioned(user);
      }

      if (curChunk.length === 75) {
        // Give dynamo some rest
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }

    pydtLogger.info(`Update complete!`);
  }

  private possiblyUpdateValue(source, sourceProp, newValue) {
    if (source[sourceProp] === newValue) {
      return false;
    }

    source[sourceProp] = newValue;

    return true;
  }
}
