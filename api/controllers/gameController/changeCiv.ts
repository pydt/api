import { RANDOM_CIV } from 'pydt-shared-models';
import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import { ChangeCivRequestBody } from './_models';

@Route('game')
@Tags('game')
@provideSingleton(GameController_ChangeCiv)
export class GameController_ChangeCiv {
  constructor(@inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/changeCiv')
  public async changeCiv(@Request() request: HttpRequest, gameId: string, @Body() body: ChangeCivRequestBody): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (game.inProgress) {
      throw new HttpResponseError(400, 'Game in Progress');
    }

    if (body.playerCiv !== RANDOM_CIV.leaderKey && game.players.map(x => x.civType).indexOf(body.playerCiv) >= 0) {
      throw new HttpResponseError(400, 'Civ already in Game');
    }

    if (game.randomOnly && body.playerCiv !== RANDOM_CIV.leaderKey) {
      throw new HttpResponseError(400, 'Only random civs allowed!');
    }

    const player = game.players.find(p => {
      return p.steamId === request.user;
    });

    if (!player) {
      throw new HttpResponseError(400, 'Player not in Game');
    }

    player.civType = body.playerCiv;

    return this.gameRepository.saveVersioned(game);
  }
}
