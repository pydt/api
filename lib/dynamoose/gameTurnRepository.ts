import { GameTurn, GameTurnKey } from '../models';
import { IRepository, dynamoose, IInternalRepository } from './common';
import { Config } from '../config';
import { iocContainer } from '../ioc';

export const GAME_TURN_REPOSITORY_SYMBOL = Symbol('IGameTurnRepository');

export interface IGameTurnRepository extends IRepository<GameTurnKey, GameTurn> {
  getTurnsForGame(gameId: string, startTurn: number, endTurn: number): Promise<GameTurn[]>;
  getPlayerTurnsForGame(gameId: string, steamId: string): Promise<GameTurn[]>;
}

interface InternalGameTurnRepository extends IGameTurnRepository, IInternalRepository<GameTurnKey, GameTurn> {
}

const gameTurnRepository = dynamoose.createVersionedModel(Config.resourcePrefix() + 'game-turn', {
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
    default: function() {
      return new Date();
    }
  },
  endDate: Date,
  skipped: Boolean
}) as InternalGameTurnRepository;

gameTurnRepository.getTurnsForGame = (gameId: string, startTurn, endTurn) => {
  return gameTurnRepository.query('gameId').eq(gameId).where('turn').between(startTurn, endTurn).exec();
};

gameTurnRepository.getPlayerTurnsForGame = (gameId: string, steamId: string) => {
  return gameTurnRepository.query('gameId').eq(gameId).filter('playerSteamId').eq(steamId).exec();
};

iocContainer.bind<IGameTurnRepository>(GAME_TURN_REPOSITORY_SYMBOL).toConstantValue(gameTurnRepository);
