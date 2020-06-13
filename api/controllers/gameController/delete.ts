import { Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { GAME_SERVICE_SYMBOL, IGameService } from '../../../lib/services/gameService';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Delete)
export class GameController_Delete {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_SERVICE_SYMBOL) private gameService: IGameService
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/delete')
  public async delete(@Request() request: HttpRequest, gameId: string): Promise<void> {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, 'Only the creator of the game can delete the game!');
    }

    if (game.inProgress && game.gameTurnRangeKey > 1) {
      throw new HttpResponseError(400, `Can't delete an in progress game!`);
    }

    await this.gameService.deleteGame(game, request.user);
  }
}
