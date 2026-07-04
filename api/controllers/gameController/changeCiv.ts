import { Body, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { RANDOM_CIV } from '../../../lib/metadata/civGame';
import { PYDT_METADATA } from '../../../lib/metadata/metadata';
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
  public async changeCiv(
    @Request() request: HttpRequest,
    gameId: string,
    @Body() body: ChangeCivRequestBody
  ): Promise<Game> {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if ((game.gameTurnRangeKey || 0) > 1) {
      throw new HttpResponseError(400, 'Game in Progress');
    }

    if (game.createdBySteamId !== request.user && body.steamId) {
      throw new HttpResponseError(400, `Only admin can change civ for another player!`);
    }

    const steamId = body.steamId || request.user;

    if (
      !game.allowDuplicateLeaders &&
      body.playerCiv !== RANDOM_CIV.leaderKey &&
      game.players.map(x => x.civType).indexOf(body.playerCiv) >= 0
    ) {
      throw new HttpResponseError(400, 'Civ already in Game');
    }

    if (game.randomOnly === 'FORCE_RANDOM' && body.playerCiv !== RANDOM_CIV.leaderKey) {
      throw new HttpResponseError(400, 'Only random civs allowed!');
    }

    if (game.randomOnly === 'FORCE_LEADER' && body.playerCiv === RANDOM_CIV.leaderKey) {
      throw new HttpResponseError(400, 'You must select a leader, not random!');
    }

    const civGame = PYDT_METADATA.civGames.find(x => x.id === game.gameType);

    if (
      civGame?.separateLeaderCiv &&
      !game.allowDuplicateLeaders &&
      body.playerCivilization &&
      body.playerCivilization !== RANDOM_CIV.civKey &&
      game.players
        .filter(p => p.steamId !== steamId)
        .map(x => x.civilization)
        .indexOf(body.playerCivilization) >= 0
    ) {
      throw new HttpResponseError(400, 'Civilization already in Game');
    }

    const player = game.players.find(p => p.steamId === steamId);

    if (!player) {
      throw new HttpResponseError(400, 'Player not in Game');
    }

    player.civType = body.playerCiv;

    if (civGame?.separateLeaderCiv) {
      player.civilization = body.playerCivilization;
    }

    return this.gameRepository.saveVersioned(game);
  }
}
