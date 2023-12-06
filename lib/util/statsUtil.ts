import { HOUR_OF_DAY_KEY, ONE_HOUR, TURN_BUCKETS } from 'pydt-shared-models';
import { Game, GamePlayer, GameTurn, GameTypeTurnData, TurnData, User } from '../models';

export class StatsUtil {
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
      if (!turnData.firstTurnEndDate || gameTurn.endDate < turnData.firstTurnEndDate) {
        turnData.firstTurnEndDate = gameTurn.endDate;
      }

      if (!turnData.lastTurnEndDate || gameTurn.endDate > turnData.lastTurnEndDate) {
        turnData.lastTurnEndDate = gameTurn.endDate;
      }

      turnData.turnLengthBuckets = turnData.turnLengthBuckets || {};
      turnData.yearBuckets = turnData.yearBuckets || {};

      if (gameTurn.skipped) {
        turnData.turnsSkipped = (turnData.turnsSkipped || 0) + undoInc;
      } else {
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
