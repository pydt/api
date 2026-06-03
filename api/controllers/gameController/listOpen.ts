import { orderBy } from 'lodash';
import { Get, Route, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { Game } from '../../../lib/models';
import { OpenGamesResponse, OpenSlotsGame } from './_models';

@Route('game')
@Tags('game')
@provideSingleton(GameController_ListOpen)
export class GameController_ListOpen {
  constructor(@inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository) {}

  @Get('listOpen')
  public async listOpen(): Promise<OpenGamesResponse> {
    const games = await this.gameRepository.incompleteGames();
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

  @Get('notStarted')
  public async notStarted(): Promise<Game[]> {
    const games = await this.gameRepository.unstartedGames(0);
    return orderBy(games, ['createdAt'], ['desc']);
  }

  @Get('openSlots')
  public async openSlots(): Promise<OpenSlotsGame[]> {
    const games = await this.gameRepository.incompleteGames();
    return orderBy(games, ['createdAt'], ['desc'])
      .filter(game => game.inProgress && !game.completed)
      .map(game => {
        const activeOrDeadHumans = game.players.filter(player => {
          // We want to count all human players who:
          // - have a steamId (so not an open slot)
          // AND
          // - are either dead or still active (so not a human player who has surrendered)
          return player.steamId && (player.isDead || !player.hasSurrendered);
        }).length;

        const joinAfterStart =
          game.allowJoinAfterStart &&
          activeOrDeadHumans < game.players.length &&
          activeOrDeadHumans < game.humans;
        const substitutionRequested = game.players.some(x => x.substitutionRequested);

        return {
          ...game,
          joinAfterStart,
          substitutionRequested
        };
      })
      .filter(x => x.joinAfterStart || x.substitutionRequested);
  }
}
