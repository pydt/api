import { orderBy } from 'lodash';
import { Get, Response, Route, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models';
import { ErrorResponse } from '../../framework';
import { OpenGamesResponse } from './_models';

@Route('game')
@Tags('game')
@provideSingleton(GameController_ListOpen)
export class GameController_ListOpen {
  constructor(@inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository) {}

  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('listOpen')
  public async listOpen(): Promise<OpenGamesResponse> {
    const games: Game[] = await this.gameRepository.incompleteGames();
    const orderedGames = orderBy(games, ['createdAt'], ['desc']);

    return {
      notStarted: orderedGames.filter(game => {
        return !game.inProgress;
      }),
      openSlots: orderedGames.filter(game => {
        const numHumans = game.players.filter(player => {
          return !!player.steamId;
        }).length;

        return (
          game.inProgress &&
          game.allowJoinAfterStart &&
          !game.hashedPassword &&
          !game.completed &&
          numHumans < game.players.length &&
          numHumans < game.humans
        );
      })
    };
  }
}
