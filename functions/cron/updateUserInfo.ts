import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { getPlayerSummaries } from '../../lib/steamUtil';
import { loggingHandler } from '../../lib/logging';
import { User } from '../../lib/models/user';
import { inject } from '../../lib/ioc';
import { injectable } from 'inversify';
import * as _ from 'lodash';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const uui = iocContainer.resolve(UpdateUserInfo);
  await uui.execute();
});

@injectable()
export class UpdateUserInfo {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository
  ) {
  }

  public async execute(): Promise<void> {
    const usersToUpdate: User[] = [];
    const users = await this.userRepository.allUsers();
  
    await Promise.all(_.map(_.chunk(users, 75), async chunk => {
      const steamIds = _.map(chunk, 'steamId');
  
      const players = await getPlayerSummaries(steamIds);
  
      for (let user of chunk) {
        const curPlayer = _.find(players, player => {
          return user.steamId === player.steamid;
        });
  
        const isDirty = this.possiblyUpdateValue(user, 'displayName', curPlayer.personaname) ||
          this.possiblyUpdateValue(user, 'avatarSmall', curPlayer.avatar) ||
          this.possiblyUpdateValue(user, 'avatarMedium', curPlayer.avatarmedium) ||
          this.possiblyUpdateValue(user, 'avatarFull', curPlayer.avatarfull);
  
        if (isDirty) {
          console.log(`Updating ${user.displayName}...`);
          usersToUpdate.push(user);
        }
      }
    }));
  
    for (const user of usersToUpdate) {
      await this.userRepository.saveVersioned(user);
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
