
import { IRepository, dynamoose } from './common';
import { Game, User } from '../models';
import { Config } from '../config';
import { iocContainer } from '../ioc';
import * as _ from 'lodash';

export const GAME_REPOSITORY_SYMBOL = Symbol('IGameRepository');

export interface IGameRepository extends IRepository<string, Game> {
  getGamesForUser(user: User): Promise<Game[]>;
}

interface InternalGameRepository extends IGameRepository {
  origBatchGet(ids: string[]): Promise<Game[]>;
}

const internalGameRepository = dynamoose.createVersionedModel(Config.resourcePrefix() + 'game', {
  gameId: {
    type: String,
    hashKey: true,
    required: true
  },
  createdBySteamId: {
    type: String,
    required: true
  },
  dlc: [String],
  inProgress: Boolean,
  completed: Boolean,
  hashedPassword: String,
  displayName: {
    type: String,
    required: true
  },
  allowJoinAfterStart: Boolean,
  description: String,
  slots: Number,
  humans: Number,
  players: [
    {
      steamId: String,
      civType: String,
      hasSurrendered: Boolean,
      turnsPlayed: {
        type: Number,
        default: 0
      },
      turnsSkipped: {
        type: Number,
        default: 0
      },
      timeTaken: {
        type: Number,
        default: 0
      },
      fastTurns: {
        type: Number,
        default: 0
      },
      slowTurns: {
        type: Number,
        default: 0
      }
    }
  ],
  discourseTopicId: Number,
  currentPlayerSteamId: {
    type: String,
    required: true
  },
  turnTimerMinutes: Number,
  round: {
    type: Number,
    required: true,
    default: 1
  },
  gameTurnRangeKey: {
    type: Number,
    required: true,
    default: 1
  },
  gameSpeed: String,
  mapFile: String,
  mapSize: String
}) as InternalGameRepository;

const gameRepository: IGameRepository = internalGameRepository;

if (!internalGameRepository.origBatchGet) {
  internalGameRepository.origBatchGet = internalGameRepository.batchGet;
}

gameRepository.batchGet = gameKeys => {
  return internalGameRepository.origBatchGet(gameKeys).then(games => {
    return _.orderBy(games, ['createdAt'], ['desc']);
  });
};

gameRepository.getGamesForUser = user => {
  const gameKeys = user.activeGameIds || [];

  if (gameKeys.length > 0) {
    return gameRepository.batchGet(gameKeys);
  } else {
    return Promise.resolve([]);
  }
};

iocContainer.bind<IGameRepository>(GAME_REPOSITORY_SYMBOL).toConstantValue(gameRepository);
