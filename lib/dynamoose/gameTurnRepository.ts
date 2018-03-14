import { GameTurn, GameTurnKey } from '../models';
import { IRepository, dynamoose } from './common';
import { Config } from '../config';
import { iocContainer } from '../ioc';

export const GAME_TURN_REPOSITORY_SYMBOL = Symbol('IGameTurnRepository');

export interface IGameTurnRepository extends IRepository<GameTurnKey, GameTurn> {
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
}) as IGameTurnRepository;

iocContainer.bind<IGameTurnRepository>(GAME_TURN_REPOSITORY_SYMBOL).toConstantValue(gameTurnRepository);
