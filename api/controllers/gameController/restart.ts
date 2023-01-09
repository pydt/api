import { Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { DISCOURSE_PROVIDER_SYMBOL, IDiscourseProvider } from '../../../lib/discourseProvider';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import {
  GAME_TURN_REPOSITORY_SYMBOL,
  IGameTurnRepository
} from '../../../lib/dynamoose/gameTurnRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game, GameTurn } from '../../../lib/models';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Restart)
export class GameController_Restart {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(DISCOURSE_PROVIDER_SYMBOL) private discourse: IDiscourseProvider
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/restart')
  public async restart(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, "You don't have permission to restart this game!");
    }

    if (!game.inProgress || game.gameTurnRangeKey <= 1) {
      throw new HttpResponseError(400, 'Game must be in progress to restart!');
    }

    if (game.round > 2) {
      throw new HttpResponseError(400, 'Cannot restart game after round 2!');
    }

    const turns = await this.gameTurnRepository.getTurnsForGame(gameId, 0, 1000);

    // Delete all game turns
    await Promise.all(
      turns.map(i => this.gameTurnRepository.delete({ gameId: gameId, turn: i.turn }))
    );

    // Reset state
    game.round = 1;
    game.gameTurnRangeKey = 1;
    game.currentPlayerSteamId = game.createdBySteamId;
    game.lastTurnEndDate = undefined;
    game.players = game.players
      .filter(x => !!x.steamId)
      // DON'T REVIVE SURRENDEDERED PLAYERS FOR A RESTART
      .filter(x => !x.hasSurrendered)
      .map(x => ({
        civType: x.civType,
        steamId: x.steamId
      }));
    await this.gameRepository.saveVersioned(game);

    // Recreate initial turn
    const firstTurn: GameTurn = {
      gameId: game.gameId,
      turn: 1,
      round: 1,
      playerSteamId: game.createdBySteamId
    };

    await this.gameTurnRepository.saveVersioned(firstTurn);

    // Post reset notification to smack
    await this.discourse.postToSmack(
      game.discourseTopicId,
      'This game has been reset by the admin.'
    );

    return game;
  }
}
