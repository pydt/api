import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { User } from '../../../lib/models';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../../lib/snsProvider';
import { ErrorResponse, HttpRequest } from '../../framework';
import { SetUserInformationBody } from './_models';

@Route('user')
@Tags('user')
@provideSingleton(UserController_SetUserInformation)
export class UserController_SetUserInformation {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('setUserInformation')
  public async setUserInformation(
    @Request() request: HttpRequest,
    @Body() body: SetUserInformationBody
  ): Promise<User> {
    const user = await this.userRepository.get(request.user);
    user.comments = (body.comments || '').substr(0, 50);
    user.timezone = body.timezone;
    user.vacationMode = body.vacationMode;

    const result = this.userRepository.saveVersioned(user);
    const games = await this.gameRepository.getGamesForUser(user);

    if (user.vacationMode) {
      // If the user is in vacation mode, mark the game as updated so their turn will get skipped.
      for (const game of games) {
        if (game.currentPlayerSteamId === user.steamId) {
          await this.sns.gameUpdated(game);
        }
      }
    }

    return result;
  }
}
