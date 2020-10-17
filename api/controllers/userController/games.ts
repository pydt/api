import { Get, Request, Response, Route, Security, Tags } from 'tsoa';
import { Config } from '../../../lib/config';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models/game';
import { UserUtil } from '../../../lib/util/userUtil';
import { ErrorResponse, HttpRequest } from '../../framework';
import { GamesByUserResponse } from './_models';

@Route('user')
@Tags('user')
@provideSingleton(UserController_Games)
export class UserController_Games {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('games')
  public async games(@Request() request: HttpRequest): Promise<GamesByUserResponse> {
    const user = await this.userRepository.get(request.user);
    const games = await this.gameRepository.getGamesForUser(user);

    return {
      data: games,
      pollUrl: `https://${Config.resourcePrefix}saves.s3.amazonaws.com/${UserUtil.createS3GameCacheKey(request.user)}`
    };
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('completedGames')
  public async completedGames(@Request() request: HttpRequest): Promise<Game[]> {
    const user = await this.userRepository.get(request.user);
    return await this.gameRepository.getCompletedGamesForUser(user);
  }
}
