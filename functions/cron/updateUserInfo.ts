import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { getPlayerSummaries } from '../../lib/steamUtil';
import { loggingHandler } from '../../lib/logging';
import { User } from '../../lib/models/user';
import { inject } from '../../lib/ioc';
import { injectable } from 'inversify';
import { chunk } from 'lodash';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const uui = iocContainer.resolve(UpdateUserInfo);
  await uui.execute();
});

@injectable()
export class UpdateUserInfo {
  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {}

  public async execute(): Promise<void> {
    const users = await this.userRepository.allUsers();
    const usersToUpdate: User[] = [];

    for (const curChunk of chunk(users, 75)) {
      const players = await getPlayerSummaries(curChunk.map(x => x.steamId));

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
          console.log(`Couldn't find steamId ${user.steamId}!`);
        }
      }

      // Try not to get steam mad at us
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`${usersToUpdate.length} users to update...`);

    for (const curChunk of chunk(usersToUpdate, 75)) {
      for (const user of curChunk) {
        console.log(`Updating ${user.steamId} (${user.displayName})...`);
        await this.userRepository.saveVersioned(user);
      }

      if (curChunk.length === 75) {
        // Give dynamo some rest
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }

    console.log(`Update complete!`);
  }

  private possiblyUpdateValue(source, sourceProp, newValue) {
    if (source[sourceProp] === newValue) {
      return false;
    }

    source[sourceProp] = newValue;

    return true;
  }
}
