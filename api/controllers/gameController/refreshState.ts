import { Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../../lib/services/gameTurnService';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../../lib/snsProvider';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';

@Route('game')
@Tags('game')
@provideSingleton(GameController_RefreshState)
export class GameController_RefreshState {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/refreshState')
  public async refreshSave(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (!game.inProgress) {
      throw new HttpResponseError(400, 'Game must be in progress to refresh state!');
    }

    if (request.user !== '76561197973299801' && game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, "You don't have permission to refresh the game state!");
    }

    const users = await this.userRepository.getUsersForGame(game);
    await this.gameTurnService.getAndUpdateSaveFileForGameState(game, users);
    await this.sns.gameUpdated(game);

    return game;
  }
}
