import { Route, Get, Security, Response, Request, Post, Body, Query } from 'tsoa';
import { provideSingleton, inject } from '../../lib/ioc';
import { Game, User, SteamProfile } from '../../lib/models';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { ErrorResponse, HttpRequest } from '../framework';
import { Config } from '../../lib/config';
import { getPlayerSummaries } from '../../lib/steamUtil';
import { GAME_SERVICE_SYMBOL, IGameService } from '../../lib/services/gameService';
import { USER_SERVICE_SYMBOL, IUserService } from '../../lib/services/userService';
import * as _ from 'lodash';

@Route('user')
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
  @Get('')
  public async all(@Request() request: HttpRequest): Promise<User[]> {
    const result: User[] = [];
    let lastKey;

    do {
      let scan = this.userRepository.scan().where('turnsPlayed').gt(0);

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
  @Get('steamProfile')
  public async steamProfile(@Request() request: HttpRequest): Promise<SteamProfile> {
    const players = await getPlayerSummaries([request.user]);

    if (players.length !== 1) {
      throw new Error('Couldn\'t get user profile');
    }

    return players[0];
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

      result = result.concat(await getPlayerSummaries(batch));
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
