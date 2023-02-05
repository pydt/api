import { remove } from 'lodash';
import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../../lib/email/sesProvider';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models';
import { UserUtil } from '../../../lib/util/userUtil';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import {
  PRIVATE_USER_DATA_REPOSITORY_SYMBOL,
  IPrivateUserDataRepository
} from '../../../lib/dynamoose/privateUserDataRepository';
import { LeaveRequestBody } from './_models';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Leave)
export class GameController_Leave {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/leave')
  public async leave(
    @Request() request: HttpRequest,
    gameId: string,
    @Body() body: LeaveRequestBody
  ): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);
    const steamId = body.steamId || request.user;

    if (game.createdBySteamId === steamId) {
      throw new HttpResponseError(400, `You can't leave, you created the game!`);
    }

    if (game.createdBySteamId !== request.user && body.steamId) {
      throw new HttpResponseError(400, `Only admin can change civ for another player!`);
    }

    if (game.inProgress && game.gameTurnRangeKey > 1) {
      throw new HttpResponseError(400, 'You can only leave a game before it starts.');
    }

    if (game.players.map(x => x.steamId).indexOf(steamId) < 0) {
      throw new HttpResponseError(400, 'Player not in Game');
    }

    const users = await this.userRepository.getUsersForGame(game);
    const user = users.find(x => x.steamId === steamId);

    remove(game.players, player => {
      return player.steamId === steamId;
    });

    UserUtil.removeUserFromGame(user, game, false);

    await Promise.all([
      this.gameRepository.saveVersioned(game),
      this.userRepository.saveVersioned(user)
    ]);

    const puds = await this.pudRepository.getUserDataForGame(game);
    const createdByUserData = puds.find(x => x.steamId === game.createdBySteamId);

    if (createdByUserData.emailAddress && !body.steamId) {
      await this.ses.sendEmail(
        'A user has left your game.',
        'A user has left your game.',
        `The user <b>${user.displayName}</b> has left your game <b>${game.displayName}</b>.  ` +
          `There are now <b>${game.players.length} / ${game.humans}</b> human players in the game.`,
        createdByUserData.emailAddress
      );
    }

    return game;
  }
}
