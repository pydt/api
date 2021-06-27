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

    for (const curChunk of chunk(users, 75)) {
      const usersToUpdate: User[] = [];
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
            console.log(`Updating ${user.displayName}...`);
            usersToUpdate.push(user);
          }
        } else {
          console.log(`Couldn't find steamId ${user.steamId}!`);
        }
      }

      for (const user of usersToUpdate) {
        await this.userRepository.saveVersioned(user);
      }
    }
  }

  private possiblyUpdateValue(source, sourceProp, newValue) {
    if (source[sourceProp] === newValue) {
      return false;
    }

    source[sourceProp] = newValue;

    return true;
  }
}
