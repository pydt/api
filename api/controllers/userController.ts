import { Route, Get, Security, Response, Request, Post, Body, Query } from 'tsoa';
import { provideSingleton } from '../../lib/ioc';
import { Game, User, SteamProfile } from '../../lib/models';
import { userRepository } from '../../lib/dynamoose/userRepository';
import { ErrorResponse, HttpRequest } from '../framework';
import { Config } from '../../lib/config';
import { gameRepository } from '../../lib/dynamoose/gameRepository';
import { getPlayerSummaries } from '../../lib/steamUtil';

@Route('user')
@provideSingleton(UserController)
export class UserController {
  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('games')
  public async games(@Request() request: HttpRequest): Promise<GamesByUserResponse> {
    const user = await userRepository.get(request.user.steamId);
    const games = await gameRepository.getGamesForUser(user);

    return {
      data: games,
      pollUrl: `https://${Config.resourcePrefix()}saves.s3.amazonaws.com/${userRepository.createS3GameCacheKey(request.user.steamId)}`
    };
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('')
  public async all(@Request() request: HttpRequest): Promise<User[]> {
    const result: User[] = [];
    let lastKey;

    do {
      let scan = userRepository.scan().where('turnsPlayed').gt(0);

      if (lastKey) {
        scan = scan.startAt(lastKey);
      }

      const users: User[] = await scan.exec();

      for (const user of users) {
        delete user.emailAddress; // make sure email address isn't returned!
      }

      lastKey = (users as any).lastKey;
    } while (lastKey);

    return result;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('getCurrent')
  public getCurrent(@Request() request: HttpRequest): Promise<User> {
    return userRepository.get(request.user.steamId);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('setNotificationEmail')
  public async setNotificationEmail(@Request() request: HttpRequest, @Body() body: SetNotificationEmailBody): Promise<User> {
    const user = await userRepository.get(request.user.steamId);
    user.emailAddress = body.emailAddress;
    return userRepository.saveVersioned(user);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('steamProfile')
  public async steamProfile(@Request() request: HttpRequest): Promise<SteamProfile> {
    const players = await getPlayerSummaries([request.user.steamId]);

    if (players.length !== 1) {
      throw new Error('Couldn\'t get user profile');
    }

    return players[0];
  }

  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('steamProfiles')
  public async steamProfiles(@Query('steamIds') rawSteamIds: string): Promise<SteamProfile[]> {
    const steamIds = rawSteamIds.split(',') || [];

    // Ensure that all requested users are in our DB...
    const users = await userRepository.batchGet(steamIds);

    if (steamIds.length !== users.length) {
      throw new Error('Invalid users');
    }

    return getPlayerSummaries(steamIds);
  }

  @Get('{steamId}')
  public async byId(@Request() request: HttpRequest, steamId: string): Promise<User> {
    const user = await userRepository.get(steamId);
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
