import { Get, Request, Response, Route, Security, Tags } from 'tsoa';
import { provideSingleton } from '../../../lib/ioc';
import { SteamProfile } from '../../../lib/models';
import { ErrorResponse, HttpRequest } from '../../framework';
import { UserController_SteamProfiles } from './steamProfiles';

@Route('user')
@Tags('user')
@provideSingleton(UserController_SteamProfile)
export class UserController_SteamProfile {
  constructor(private ucSteamProfiles: UserController_SteamProfiles) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('steamProfile')
  public async steamProfile(@Request() request: HttpRequest): Promise<SteamProfile> {
    const profiles = await this.ucSteamProfiles.steamProfiles(request.user);

    if (profiles.length !== 1) {
      throw new Error("Couldn't get user profile");
    }

    return profiles[0];
  }
}
