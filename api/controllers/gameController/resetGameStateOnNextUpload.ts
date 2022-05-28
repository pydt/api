import { Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';

@Route('game')
@Tags('game')
@provideSingleton(GameController_ResetGameStateOnNextUpload)
export class GameController_ResetGameStateOnNextUpload {
  constructor(@inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/resetGameStateOnNextUpload')
  public async resetGameStateOnNextUpload(
    @Request() request: HttpRequest,
    gameId: string
  ): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (!game.inProgress) {
      throw new HttpResponseError(400, `This doesn't make sense until the game is in progress!`);
    }

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, "You didn't create this game!");
    }

    game.resetGameStateOnNextUpload = true;
    await this.gameRepository.saveVersioned(game);

    return game;
  }
}
