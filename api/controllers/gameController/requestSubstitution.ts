import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import { RequestSubstitutionBody } from './_models';

@Route('game')
@Tags('game')
@provideSingleton(GameController_RequestSubstitution)
export class GameController_RequestSubstitution {
  constructor(@inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/requestSubstitution')
  public async requestSubstitution(
    @Request() request: HttpRequest,
    gameId: string,
    @Body() body: RequestSubstitutionBody
  ): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);
    const steamId = body.steamId || request.user;

    if (game.createdBySteamId !== request.user && body.steamId) {
      throw new HttpResponseError(400, `Only admin can request substitution for another player!`);
    }

    if (!game.inProgress) {
      throw new HttpResponseError(400, 'You can only request substitution for a started game.');
    }

    const player = game.players.find(x => x.steamId === steamId);

    if (!player) {
      throw new HttpResponseError(400, 'Player not in Game');
    }

    player.substitutionRequested = !player.substitutionRequested;

    await this.gameRepository.saveVersioned(game);

    return game;
  }
}
