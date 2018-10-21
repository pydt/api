
import * as _ from 'lodash';
import * as moment from 'moment';
import { CIV6_GAME } from 'pydt-shared';
import { Config } from '../config';
import { iocContainer } from '../ioc';
import { Game } from '../models';
import { dynamoose, IInternalRepository, IRepository } from './common';

export const GAME_REPOSITORY_SYMBOL = Symbol('IGameRepository');

export interface IGameRepository extends IRepository<string, Game> {
  incompleteGames(): Promise<Game[]>;
  unstartedGames(daysOld: number): Promise<Game[]>;
  getByDiscourseTopicId(topicId: number): Promise<Game>;
}

interface InternalGameRepository extends IGameRepository, IInternalRepository<string, Game> {
  origGet(id: string): Promise<Game>;
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
  gameType: String,
  mapFile: String,
  mapSize: String,
  latestDiscoursePostNumber: Number,
  lastTurnEndDate: Date,
  randomOnly: Boolean
}) as InternalGameRepository;

gameRepository.origGet = gameRepository.origGet || gameRepository.get;

gameRepository.get = async key => {
  return setDefaults(await gameRepository.origGet(key));
};

gameRepository.origBatchGet = gameRepository.origBatchGet || gameRepository.batchGet;

gameRepository.batchGet = async gameKeys => {
  const games: Game[] = await gameRepository.origBatchGet(gameKeys);
  return _.orderBy(games, ['createdAt'], ['desc']).map(g => setDefaults(g));
};

gameRepository.incompleteGames = async () => {
  const games: Game[] = await gameRepository.scan('completed').not().eq(true).exec();
  return games.map(g => setDefaults(g));
};

gameRepository.unstartedGames = async (daysOld: number) => {
  const games: Game[] = await gameRepository
    .scan('inProgress').not().eq(true)
    .where('createdAt').lt(moment().add(daysOld * -1, 'days').valueOf())
    .exec();

  return games.map(g => setDefaults(g));
}

gameRepository.getByDiscourseTopicId = async (topicId: number) => {
  const topics = await gameRepository
    .scan('discourseTopicId').eq(topicId)
    .exec();

  if (!topics) {
    return null;
  }

  return setDefaults(topics[0]);
};

function setDefaults(game: Game) {
  if (game) {
    game.gameType = game.gameType || CIV6_GAME.id;
  }

  return game;
}

iocContainer.bind<IGameRepository>(GAME_REPOSITORY_SYMBOL).toConstantValue(gameRepository);
