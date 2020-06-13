import { compact } from 'lodash';
import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import { UpdateTurnOrderRequestBody } from './_models';

@Route('game')
@Tags('game')
@provideSingleton(GameController_UpdateTurnOrder)
export class GameController_UpdateTurnOrder {
  constructor(@inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/updateTurnOrder')
  public async updateTurnOrder(@Request() request: HttpRequest, gameId: string, @Body() body: UpdateTurnOrderRequestBody): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, `You didn't create this game!`);
    }

    if (!!game.inProgress) {
      throw new HttpResponseError(400, `Can't update turn order after game start!`);
    }

    if (game.players.length !== body.steamIds.length) {
      throw new HttpResponseError(400, `Wrong number of steamIds`);
    }

    if (game.createdBySteamId !== body.steamIds[0]) {
      throw new HttpResponseError(400, `The player that created the game must be the first player!`);
    }

    const newPlayers = compact(
      body.steamIds.map(steamId => {
        return game.players.find(p => p.steamId === steamId);
      })
    );

    if (newPlayers.length !== game.players.length) {
      throw new HttpResponseError(400, `Invalid steamIds`);
    }

    game.players = newPlayers;

    return this.gameRepository.saveVersioned(game);
  }
}
