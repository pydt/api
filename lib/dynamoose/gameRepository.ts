
import { IRepository, dynamoose, IInternalRepository } from './common';
import { Game } from '../models';
import { Config } from '../config';
import { iocContainer } from '../ioc';
import * as _ from 'lodash';
import * as moment from 'moment';

export const GAME_REPOSITORY_SYMBOL = Symbol('IGameRepository');

export interface IGameRepository extends IRepository<string, Game> {
  incompleteGames(): Promise<Game[]>;
  unstartedGames(daysOld: number): Promise<Game[]>;
  getByDiscourseTopicId(topicId: number): Promise<Game>;
}

interface InternalGameRepository extends IGameRepository, IInternalRepository<string, Game> {
  origBatchGet(ids: string[]): Promise<Game[]>;
}

const gameRepository = dynamoose.createVersionedModel(Config.resourcePrefix() + 'game', {
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
  mapSize: String,
  latestDiscoursePostNumber: Number,
  lastTurnEndDate: Date,
  randomOnly: Boolean
}) as InternalGameRepository;

if (!gameRepository.origBatchGet) {
  gameRepository.origBatchGet = gameRepository.batchGet;
}

gameRepository.batchGet = gameKeys => {
  return gameRepository.origBatchGet(gameKeys).then(games => {
    return _.orderBy(games, ['createdAt'], ['desc']);
  });
};

gameRepository.incompleteGames = () => {
  return gameRepository.scan('completed').not().eq(true).exec();
};

gameRepository.unstartedGames = (daysOld: number) => {
  return gameRepository
    .scan('inProgress').not().eq(true)
    .where('createdAt').lt(moment().add(daysOld * -1, 'days').valueOf())
    .exec();
}

gameRepository.getByDiscourseTopicId = async (topicId: number) => {
  const topics = await gameRepository
    .scan('discourseTopicId').eq(topicId)
    .exec();

  if (!topics) {
    return null;
  }

  return topics[0];
};

iocContainer.bind<IGameRepository>(GAME_REPOSITORY_SYMBOL).toConstantValue(gameRepository);
