import { HOUR_OF_DAY_KEY, ONE_HOUR, TURN_BUCKETS } from 'pydt-shared-models';
import { Game, GamePlayer, GameTurn, GameTypeTurnData, TurnData, User } from '../models';

// How many of a player's latest finished turns go into User.recentTurnAverage
export const RECENT_TURN_COUNT = 100;

export class StatsUtil {
  // Turns to fetch for recentTurnStats: the user can have one turn in progress per active game, and
  // those come back from the index too, so ask for enough to still leave RECENT_TURN_COUNT finished ones.
  // The extra 10 covers stray unfinished turns from old games that activeGameIds doesn't account for
  // (on prod, 46 heavy players came up 1-2 short without it).
  public static recentTurnQueryLimit(user: Pick<User, 'activeGameIds'>) {
    return RECENT_TURN_COUNT + (user.activeGameIds?.length || 0) + 10;
  }

  /**
   * Average length of the newest RECENT_TURN_COUNT finished turns in `turns`. `changedTurn` replaces
   * its stored copy (same gameId + turn): the GSI is eventually consistent, so a turn that was just
   * closed or reopened may not show its change there yet. Turns without an end date (in progress, or
   * reopened by a revert) don't count. Skipped turns count at their real length.
   */
  public static recentTurnStats(
    turns: GameTurn[],
    changedTurn?: GameTurn
  ): Pick<User, 'recentTurnAverage' | 'recentTurnCount'> {
    const byKey = new Map<string, GameTurn>();

    for (const t of [...(turns || []), ...(changedTurn ? [changedTurn] : [])]) {
      byKey.set(`${t.gameId}:${t.turn}`, t);
    }

    const time = (d: Date | number | string) => new Date(d).getTime();
    const finished = [...byKey.values()]
      .filter(t => t.startDate && t.endDate)
      .sort((a, b) => time(b.endDate) - time(a.endDate))
      .slice(0, RECENT_TURN_COUNT);

    if (!finished.length) {
      return { recentTurnAverage: undefined, recentTurnCount: 0 };
    }

    const total = finished.reduce((sum, t) => sum + (time(t.endDate) - time(t.startDate)), 0);

    return {
      recentTurnAverage: Math.round(total / finished.length),
      recentTurnCount: finished.length
    };
  }

  public static getGameStats(user: { statsByGameType: GameTypeTurnData[] }, gameType: string) {
    user.statsByGameType = user.statsByGameType || [];
    let gameStats = user.statsByGameType.find(x => x.gameType === gameType);

    if (!gameStats) {
      gameStats = {
        gameType: gameType,
        activeGames: 0,
        totalGames: 0,
        fastTurns: 0,
        slowTurns: 0,
        timeTaken: 0,
        turnsPlayed: 0,
        turnsSkipped: 0,
        dayOfWeekQueue: '',
        hourOfDayQueue: '',
        turnLengthBuckets: {},
        yearBuckets: {}
      };

      user.statsByGameType.push(gameStats);
    }

    return gameStats;
  }

  public static updateTurnStatistics(game: Game, gameTurn: GameTurn, user: User, undo?: boolean) {
    const player =
      game.players.find(p => {
        return p.steamId === user.steamId;
      }) || ({} as GamePlayer);

    const gameStats = StatsUtil.getGameStats(user, game.gameType);

    StatsUtil.updateTurnData(gameTurn, player, !!undo);
    StatsUtil.updateTurnData(gameTurn, user, !!undo);
    StatsUtil.updateTurnData(gameTurn, gameStats, !!undo);
    StatsUtil.updateTurnData(gameTurn, game, !!undo);
  }

  public static fixTurnDataDates(turnData: Partial<TurnData>) {
    turnData.firstTurnEndDate = turnData.firstTurnEndDate
      ? new Date(turnData.firstTurnEndDate)
      : undefined;
    turnData.lastTurnEndDate = turnData.lastTurnEndDate
      ? new Date(turnData.lastTurnEndDate)
      : undefined;

    return turnData;
  }

  public static updateTurnData(gameTurn: GameTurn, turnData: Partial<TurnData>, undo: boolean) {
    const undoInc = undo ? -1 : 1;

    if (gameTurn.endDate) {
      turnData.turnLengthBuckets = turnData.turnLengthBuckets || {};
      turnData.yearBuckets = turnData.yearBuckets || {};

      if (gameTurn.skipped) {
        turnData.turnsSkipped = (turnData.turnsSkipped || 0) + undoInc;
      } else {
        if (!undo) {
          if (!turnData.firstTurnEndDate || gameTurn.endDate < turnData.firstTurnEndDate) {
            turnData.firstTurnEndDate = gameTurn.endDate;
          }

          if (!turnData.lastTurnEndDate || gameTurn.endDate > turnData.lastTurnEndDate) {
            turnData.lastTurnEndDate = gameTurn.endDate;
          }
        }

        turnData.turnsPlayed = (turnData.turnsPlayed || 0) + undoInc;

        const timeTaken = gameTurn.endDate.getTime() - gameTurn.startDate.getTime();
        turnData.timeTaken = (turnData.timeTaken || 0) + timeTaken * undoInc;

        if (timeTaken < ONE_HOUR) {
          turnData.fastTurns = (turnData.fastTurns || 0) + undoInc;
        }

        if (timeTaken > ONE_HOUR * 6) {
          turnData.slowTurns = (turnData.slowTurns || 0) + undoInc;
        }

        const MAX_QUEUE_LENGTH = 100;

        // Not sure undoing these queues will make sense in all scenarios...
        if (!undo) {
          turnData.hourOfDayQueue =
            (turnData.hourOfDayQueue || '') + HOUR_OF_DAY_KEY[gameTurn.endDate.getUTCHours()];

          if (turnData.hourOfDayQueue.length > MAX_QUEUE_LENGTH) {
            turnData.hourOfDayQueue = turnData.hourOfDayQueue.substring(
              turnData.hourOfDayQueue.length - MAX_QUEUE_LENGTH
            );
          }

          turnData.dayOfWeekQueue = (turnData.dayOfWeekQueue || '') + gameTurn.endDate.getUTCDay();

          if (turnData.dayOfWeekQueue.length > MAX_QUEUE_LENGTH) {
            turnData.dayOfWeekQueue = turnData.dayOfWeekQueue.substring(
              turnData.dayOfWeekQueue.length - MAX_QUEUE_LENGTH
            );
          }
        }

        turnData.yearBuckets[gameTurn.endDate.getUTCFullYear()] =
          (turnData.yearBuckets[gameTurn.endDate.getUTCFullYear()] || 0) + undoInc;

        for (const bucket of TURN_BUCKETS) {
          if (timeTaken < bucket) {
            turnData.turnLengthBuckets[bucket] =
              (turnData.turnLengthBuckets[bucket] || 0) + undoInc;
            break;
          }
        }
      }
    }
  }
}
