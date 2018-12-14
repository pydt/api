import * as _ from 'lodash';
import { Body, Get, Post, Query, Request, Response, Route, Security, Tags } from 'tsoa';

import { Config } from '../../lib/config';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../lib/ioc';
import { Game, SteamProfile, User } from '../../lib/models';
import { GAME_SERVICE_SYMBOL, IGameService } from '../../lib/services/gameService';
import { IUserService, USER_SERVICE_SYMBOL } from '../../lib/services/userService';
import { ErrorResponse, HttpRequest } from '../framework';

@Route('user')
@Tags('user')
@provideSingleton(UserController)
export class UserController {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(USER_SERVICE_SYMBOL) private userService: IUserService,
    @inject(GAME_SERVICE_SYMBOL) private gameService: IGameService
  ) {
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('games')
  public async games(@Request() request: HttpRequest): Promise<GamesByUserResponse> {
    const user = await this.userRepository.get(request.user);
    const games = await this.gameService.getGamesForUser(user);

    return {
      data: games,
      pollUrl: `https://${Config.resourcePrefix()}saves.s3.amazonaws.com/${this.userService.createS3GameCacheKey(request.user)}`
    };
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('getCurrent')
  public getCurrent(@Request() request: HttpRequest): Promise<User> {
    return this.userRepository.get(request.user);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('setNotificationEmail')
  public async setNotificationEmail(@Request() request: HttpRequest, @Body() body: SetNotificationEmailBody): Promise<User> {
    const user = await this.userRepository.get(request.user);
    user.emailAddress = body.emailAddress;
    return this.userRepository.saveVersioned(user);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('setUserInformation')
  public async setUserInformation(@Request() request: HttpRequest, @Body() body: SetUserInformationBody): Promise<User> {
    const user = await this.userRepository.get(request.user);
    user.comments = (body.comments || '').substr(0, 50);
    user.timezone = body.timezone;
    user.vacationMode = body.vacationMode;
    return this.userRepository.saveVersioned(user);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('steamProfile')
  public async steamProfile(@Request() request: HttpRequest): Promise<SteamProfile> {
    const profiles = await this.steamProfiles(request.user);

    if (profiles.length !== 1) {
      throw new Error('Couldn\'t get user profile');
    }

    return profiles[0];
  }

  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('steamProfiles')
  public async steamProfiles(@Query('steamIds') rawSteamIds: string): Promise<SteamProfile[]> {
    const steamIds = rawSteamIds.split(',') || [];
    let result: SteamProfile[] = [];

    for (const batch of _.chunk(steamIds, 100)) {
      // Ensure that all requested users are in our DB...
      const users = await this.userRepository.batchGet(batch);

      if (batch.length !== users.length) {
        throw new Error('Invalid users');
      }

      // TODO: There's no need to return SteamProfiles to clients anymore, we should switch to just
      // use the User model, but that'll be a pretty big refactor and we'll need to sync the release
      // or create overlapping methods until everyone is updated...
      result = result.concat(users.map(x => <SteamProfile> {
        avatar: x.avatarSmall,
        avatarfull: x.avatarFull,
        avatarmedium: x.avatarMedium,
        comments: x.comments,
        personaname: x.displayName,
        profileurl: x.steamProfileUrl,
        steamid: x.steamId,
        timezone: x.timezone,
        vacationMode: x.vacationMode
      }));
    }

    return result;
  }

  @Get('{steamId}')
  public async byId(@Request() request: HttpRequest, steamId: string): Promise<User> {
    const user = await this.userRepository.get(steamId);
    delete user.emailAddress; // make sure email address isn't returned!
    return user;
  }
}

export interface GamesByUserResponse {
  data: Game[];
  pollUrl: string;
}

export interface SetNotificationEmailBody {
  emailAddress: string;
}

export interface SetUserInformationBody {
  vacationMode?: boolean;
  timezone?: string;
  comments?: string;
}
