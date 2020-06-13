import { Config } from '../config';
import { provideSingleton } from '../ioc';
import { GameTurn, GameTurnKey } from '../models';
import { BaseDynamooseRepository, IRepository } from './common';

export const GAME_TURN_REPOSITORY_SYMBOL = Symbol('IGameTurnRepository');

export interface IGameTurnRepository extends IRepository<GameTurnKey, GameTurn> {
  getTurnsForGame(gameId: string, startTurn: number, endTurn: number): Promise<GameTurn[]>;
  getPlayerTurnsForGame(gameId: string, steamId: string): Promise<GameTurn[]>;
}

@provideSingleton(GAME_TURN_REPOSITORY_SYMBOL)
export class GameTurnRepository extends BaseDynamooseRepository<GameTurnKey, GameTurn> implements GameTurnRepository {
  constructor() {
    super(Config.resourcePrefix + 'game-turn', {
      gameId: {
        type: String,
        hashKey: true
      },
      turn: {
        type: Number,
        rangeKey: true
      },
      round: {
        type: Number,
        required: true
      },
      playerSteamId: {
        type: String,
        required: true
      },
      startDate: {
        type: Date,
        required: true,
        default: function () {
          return new Date();
        }
      },
      endDate: Date,
      skipped: Boolean
    });
  }

  getTurnsForGame(gameId: string, startTurn, endTurn) {
    return this.query('gameId').eq(gameId).where('turn').between(startTurn, endTurn).exec();
  }

  getPlayerTurnsForGame(gameId: string, steamId: string) {
    return this.getAllPaged(this.query('gameId').eq(gameId).filter('playerSteamId').eq(steamId));
  }
}
