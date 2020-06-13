import { Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { GAME_TURN_REPOSITORY_SYMBOL, IGameTurnRepository } from '../../../lib/dynamoose/gameTurnRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game, GameTurn } from '../../../lib/models';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Start)
export class GameController_Start {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/start')
  public async start(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (game.inProgress) {
      throw new HttpResponseError(400, 'Game in progress!');
    }

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, "You didn't create this game!");
    }

    if (game.players.length < 2) {
      throw new HttpResponseError(400, 'Not enough players to start the game!');
    }

    game.inProgress = true;
    await this.gameRepository.saveVersioned(game);

    const firstTurn: GameTurn = {
      gameId: game.gameId,
      turn: 1,
      round: 1,
      playerSteamId: game.createdBySteamId
    };

    await this.gameTurnRepository.saveVersioned(firstTurn);

    return game;
  }
}
