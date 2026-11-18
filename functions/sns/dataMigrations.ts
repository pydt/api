import { chunk } from 'lodash';
import { injectable } from 'inversify';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import {
  GAME_TURN_REPOSITORY_SYMBOL,
  IGameTurnRepository
} from '../../lib/dynamoose/gameTurnRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject } from '../../lib/ioc';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import { expandDlcGroups } from '../../lib/metadata/civGame';
import { CIV7_GAME } from '../../lib/metadata/civGames/civ7';
import { Game, TurnData, User } from '../../lib/models';
import { GameUtil } from '../../lib/util/gameUtil';
import { StatsUtil } from '../../lib/util/statsUtil';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const rus = iocContainer.resolve(DataMigrations);
  await rus.execute(event.Records[0].Sns.Message);
});

@injectable()
export class DataMigrations {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository
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

    if (message.startsWith('useractivegames')) {
      let users: User[];
      const userId = message.replace('useractivegames:', '');

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

      await this.recalculateActiveGameCounts(users);
    }

    if (message.startsWith('recentturns')) {
      const userId = message.replace('recentturns:', '');
      let users: User[];

      if (userId === 'all') {
        // allUsers, not usersWithTurnsPlayed: that one strips fields, and these get saved back
        users = (await this.userRepository.allUsers()).filter(x => x.turnsPlayed > 0);
      } else if (userId) {
        users = [await this.userRepository.get(userId)];

        if (!users[0]) {
          throw new Error(`user ${userId} not found`);
        }
      } else {
        throw new Error('userId or all must be provided');
      }

      await this.calculateRecentTurnStats(users);
    }

    if (message.startsWith('civ7dlcgroups')) {
      let games: Game[];
      const gameId = message.replace('civ7dlcgroups:', '');

      if (gameId === 'all') {
        games = (await this.gameRepository.allGames()).filter(x => x.gameType === CIV7_GAME.id);
      } else if (gameId) {
        const game = await this.gameRepository.get(gameId);

        if (!game) {
          throw new Error(`game ${gameId} not found`);
        }

        games = [game];
      } else {
        throw new Error('gameId or all must be provided');
      }

      await this.upgradeCiv7DlcGroups(games);
    }
  }

  // Backfill for User.recentTurnAverage: one ~2.5 RCU query per user, 10 users at a time. The run takes
  // minutes and players keep taking turns, so each user is re-read just before saving (the list from the
  // start is stale by then, and a stale version fails saveVersioned). A conflict that still happens skips
  // that user instead of aborting the run; their next turn recomputes it anyway.
  private async calculateRecentTurnStats(users: User[]) {
    let updated = 0;
    const skipped: string[] = [];

    for (const batch of chunk(users, 10)) {
      await Promise.all(
        batch.map(async ({ steamId }) => {
          try {
            const user = await this.userRepository.get(steamId, true);
            const turns = await this.gameTurnRepository.getRecentTurnsForUser(
              steamId,
              StatsUtil.recentTurnQueryLimit(user)
            );

            Object.assign(user, StatsUtil.recentTurnStats(turns));
            await this.userRepository.saveVersioned(user);
            updated++;
          } catch (e) {
            pydtLogger.warn(`Couldn't backfill recent turn stats for ${steamId}`, e as Error);
            skipped.push(steamId);
          }
        })
      );
    }

    pydtLogger.info(
      `Updated recent turn stats for ${updated} users` +
        (skipped.length ? `, skipped ${skipped.length}: ${skipped.join(', ')}` : '')
    );
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
          StatsUtil.updateTurnStatistics(
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

  // Recomputes activeGames/totalGames per game type from the user's current
  // activeGameIds/inactiveGameIds, without reparsing turn history. Use this to
  // repair drift in those counters (e.g. from bad increment/decrement logic)
  // without paying the cost of calculateUserPerGameStats's full turn replay.
  private async recalculateActiveGameCounts(users: User[]) {
    const allGames: Record<string, Game> = {};

    for (const user of users) {
      const userGameIds = [
        ...new Set([...(user.activeGameIds || []), ...(user.inactiveGameIds || [])])
      ];
      const missingGameIds = userGameIds.filter(x => !allGames[x]);

      if (missingGameIds.length) {
        const missingGames = await this.gameRepository.batchGet(missingGameIds);

        for (const game of missingGames) {
          allGames[game.gameId] = game;
        }
      }

      this.applyActiveGameCounts(user, allGames);

      try {
        await this.userRepository.saveVersioned(user);
      } catch (err) {
        // Save can fail on the version condition if the user was updated elsewhere
        // (e.g. played a turn) while we were processing this batch - reload and retry.
        console.log(
          `Error saving active game counts for user ${user.steamId}, reloading and trying again`,
          err
        );

        const reloadedUser = await this.userRepository.get(user.steamId);
        this.applyActiveGameCounts(reloadedUser, allGames);
        await this.userRepository.saveVersioned(reloadedUser);
      }

      console.log(
        `Recalculated active/total game counts for user ${user.displayName} (${user.steamId})`
      );
    }
  }

  private applyActiveGameCounts(user: User, allGames: Record<string, Game>) {
    const activeGameIds = user.activeGameIds || [];
    const userGameIds = [...new Set([...activeGameIds, ...(user.inactiveGameIds || [])])];
    const gamesByType: Record<string, Game[]> = {};

    for (const gameId of userGameIds) {
      const game = allGames[gameId];

      if (game) {
        gamesByType[game.gameType] = gamesByType[game.gameType] || [];
        gamesByType[game.gameType].push(game);
      }
    }

    for (const gameType of Object.keys(gamesByType)) {
      const gameStats = StatsUtil.getGameStats(user, gameType);
      const typeGames = gamesByType[gameType];

      gameStats.activeGames = typeGames.filter(x => activeGameIds.includes(x.gameId)).length;
      gameStats.totalGames = typeGames.length;
    }
  }

  // One-time upgrade for Civ7 games saved before dlc groups were fully enumerated
  // (they only recorded a single representative id per release). If any id from a
  // group is present, every sibling in that group gets added too, since a release's
  // contents are always installed/enabled together in-game. Applies regardless of
  // whether the game has started, since the dlc list is set at creation.
  private async upgradeCiv7DlcGroups(games: Game[]) {
    for (const game of games) {
      if ((game.dataVersion || 0) < 3 && game.gameType === CIV7_GAME.id) {
        game.dlc = expandDlcGroups(CIV7_GAME, game.dlc || []);
        game.dataVersion = 3;

        await this.gameRepository.saveVersioned(game);

        console.log(`Upgraded dlc groups for game ${game.gameId} (${game.displayName})`);
      }
    }
  }
}
