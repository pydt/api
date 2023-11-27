import { injectable } from 'inversify';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import {
  GAME_TURN_REPOSITORY_SYMBOL,
  IGameTurnRepository
} from '../../lib/dynamoose/gameTurnRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject } from '../../lib/ioc';
import { loggingHandler } from '../../lib/logging';
import { Game, TurnData, User } from '../../lib/models';
import { GameTurnService } from '../../lib/services/gameTurnService';
import {
  IMiscDataRepository,
  MISC_DATA_REPOSITORY_SYMBOL
} from '../../lib/dynamoose/miscDataRepository';
import { UserUtil } from '../../lib/util/userUtil';
import { GameUtil } from '../../lib/util/gameUtil';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const rus = iocContainer.resolve(DataMigrations);
  await rus.execute(event.Records[0].Sns.Message);
});

@injectable()
export class DataMigrations {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(MISC_DATA_REPOSITORY_SYMBOL) private miscDataRepository: IMiscDataRepository
  ) {}

  public async execute(message: string) {
    if (message.startsWith('userstats')) {
      let users: User[];
      const userId = message.replace('userstats:', '');

      if (userId === 'all') {
        users = await this.userRepository.allUsers();
      } else if (userId) {
        users = [await this.userRepository.get(userId)];

        if (!users[0]) {
          throw new Error(`user ${userId} not found`);
        }
      } else {
        throw new Error('userId or all must be provided');
      }

      await this.calculateUserPerGameStats(users);
    }

    if (message.startsWith('gamestats')) {
      let games: Game[];
      const gameId = message.replace('gamestats:', '');

      if (gameId === 'all') {
        games = await this.gameRepository.allGames();
      } else if (gameId) {
        games = [await this.gameRepository.get(gameId)];

        if (!games[0]) {
          throw new Error(`game ${gameId} not found`);
        }
      } else {
        throw new Error('gameId or all must be provided');
      }

      await this.calculateGameStats(games);
    }
  }

  private resetStats(stats: Partial<TurnData>) {
    delete stats.dayOfWeekQueue;
    delete stats.fastTurns;
    delete stats.firstTurnEndDate;
    delete stats.hourOfDayQueue;
    delete stats.lastTurnEndDate;
    delete stats.slowTurns;
    delete stats.timeTaken;
    delete stats.turnLengthBuckets;
    delete stats.turnsPlayed;
    delete stats.turnsSkipped;
    delete stats.yearBuckets;
  }

  private async calculateUserPerGameStats(users: User[]) {
    const allGames: Record<string, Game> = {};

    for (const user of users) {
      if ((user.dataVersion || 0) < 5) {
        const allTurns = await this.gameTurnRepository.getAllTurnsForUser(user.steamId);
        const userGameIds = [...new Set(allTurns.map(x => x.gameId))];
        const missingGameIds = userGameIds.filter(x => !allGames[x]);

        if (missingGameIds.length) {
          const missingGames = await this.gameRepository.batchGet(missingGameIds);

          for (const game of missingGames) {
            allGames[game.gameId] = game;
          }
        }

        this.resetStats(user);
        user.statsByGameType = [];

        for (const turn of allTurns) {
          GameTurnService.updateTurnStatistics(
            allGames[turn.gameId] ||
              ({
                players: []
              } as Game),
            turn,
            user
          );
        }

        for (const gameStats of user.statsByGameType) {
          const typeGames = userGameIds
            .map(x => allGames[x])
            .filter(x => !!x && x.gameType === gameStats.gameType);
          gameStats.activeGames = typeGames.filter(x =>
            x.players.some(y => y.steamId === user.steamId && GameUtil.playerIsHuman(y))
          ).length;
          gameStats.totalGames = typeGames.length;
        }

        user.dataVersion = 5;

        await this.userRepository.saveVersioned(user);

        console.log(`Recalculated all turn stats for user ${user.displayName} (${user.steamId})`);
      }
    }
  }

  private async calculateGameStats(games: Game[]) {
    for (const game of games) {
      if ((game.dataVersion || 0) < 2) {
        this.resetStats(game);

        for (const player of game.players) {
          this.resetStats(player);
        }

        const turns = await this.gameTurnRepository.getAllTurnsForGame(game.gameId);

        for (const turn of turns) {
          GameTurnService.updateTurnStatistics(game, turn, {
            steamId: turn.playerSteamId
          } as User);
        }

        game.dataVersion = 2;

        const globalStats = await this.miscDataRepository.getGlobalStats(true);

        for (const curStats of [
          globalStats.data,
          UserUtil.getUserGameStats(globalStats.data, game.gameType)
        ]) {
          if (
            !curStats.firstTurnEndDate ||
            (game.firstTurnEndDate && game.firstTurnEndDate < curStats.firstTurnEndDate)
          ) {
            curStats.firstTurnEndDate = game.firstTurnEndDate;
          }

          if (
            !curStats.lastTurnEndDate ||
            (game.lastTurnEndDate && game.lastTurnEndDate > curStats.lastTurnEndDate)
          ) {
            curStats.lastTurnEndDate = game.lastTurnEndDate;
          }

          curStats.dayOfWeekQueue = '';
          curStats.fastTurns = (curStats.fastTurns || 0) + (game.fastTurns || 0);
          curStats.hourOfDayQueue = '';
          curStats.slowTurns = (curStats.slowTurns || 0) + (game.slowTurns || 0);
          curStats.timeTaken = (curStats.timeTaken || 0) + (game.timeTaken || 0);
          curStats.turnsPlayed = (curStats.turnsPlayed || 0) + (game.turnsPlayed || 0);
          curStats.turnsSkipped = (curStats.turnsSkipped || 0) + (game.turnsSkipped || 0);

          for (const turnLengthKey of Object.keys(game.turnLengthBuckets || {})) {
            curStats.turnLengthBuckets[turnLengthKey] =
              (curStats.turnLengthBuckets[turnLengthKey] || 0) +
              (game.turnLengthBuckets[turnLengthKey] || 0);
          }

          for (const yearKey of Object.keys(game.yearBuckets || {})) {
            curStats.yearBuckets[yearKey] =
              (curStats.yearBuckets[yearKey] || 0) + (game.yearBuckets[yearKey] || 0);
          }
        }

        await this.gameRepository.saveVersioned(game);
        await this.miscDataRepository.saveVersioned(globalStats);

        console.log(`Recalculated game ${game.gameId} (${game.displayName})`);
      }
    }
  }
}
