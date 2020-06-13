import { chunk } from 'lodash';
import { Get, Query, Route, Tags } from 'tsoa';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { SteamProfile } from '../../../lib/models';

@Route('user')
@Tags('user')
@provideSingleton(UserController_SteamProfiles)
export class UserController_SteamProfiles {
  constructor(@inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository) {}

  @Get('steamProfiles')
  public async steamProfiles(@Query('steamIds') rawSteamIds: string): Promise<SteamProfile[]> {
    const steamIds = rawSteamIds.split(',') || [];
    let result: SteamProfile[] = [];

    for (const batch of chunk(steamIds, 100)) {
      // Ensure that all requested users are in our DB...
      const users = await this.userRepository.batchGet(batch);

      if (batch.length !== users.length) {
        throw new Error('Invalid users');
      }

      // TODO: There's no need to return SteamProfiles to clients anymore, we should switch to just
      // use the User model, but that'll be a pretty big refactor and we'll need to sync the release
      // or create overlapping methods until everyone is updated...
      result = result.concat(
        users.map(
          x =>
            <SteamProfile>{
              avatar: x.avatarSmall,
              avatarfull: x.avatarFull,
              avatarmedium: x.avatarMedium,
              comments: x.comments,
              personaname: x.displayName,
              profileurl: x.steamProfileUrl,
              steamid: x.steamId,
              timezone: x.timezone,
              vacationMode: x.vacationMode
            }
        )
      );
    }

    return result;
  }
}
