import { orderBy } from 'lodash';
import * as moment from 'moment';
import { Config } from '../config';
import { provideSingleton } from '../ioc';
import { Game, GamePlayer, User } from '../models';
import { BaseDynamooseRepository, IRepository } from './common';
import { CIV6_GAME } from '../metadata/civGames/civ6';
import { legacyBoolean, legacyStringSet } from '../util/dynamooseLegacy';

export const GAME_REPOSITORY_SYMBOL = Symbol('IGameRepository');

export interface IGameRepository extends IRepository<string, Game> {
  allGames(): Promise<Game[]>;
  getByClonedFromGameId(gameId: string): Promise<Game | undefined>;
  getGamesForUser(user: User): Promise<Game[]>;
  getCompletedGamesForUser(user: User): Promise<Game[]>;
  incompleteGames(): Promise<Game[]>;
  unstartedGames(daysOld: number): Promise<Game[]>;
  getByDiscourseTopicId(topicId: number): Promise<Game>;
}

@provideSingleton(GAME_REPOSITORY_SYMBOL)
export class GameRepository
  extends BaseDynamooseRepository<string, Game>
  implements IGameRepository
{
  constructor() {
    super(Config.resourcePrefix + 'game', {
      gameId: {
        type: String,
        hashKey: true,
        required: true
      },
      createdBySteamId: {
        type: String,
        required: true
      },
      dlc: legacyStringSet(),
      inProgress: legacyBoolean('createdAt'),
      completed: legacyBoolean('createdAt'),
      hashedPassword: String,
      displayName: {
        type: String,
        required: true
      },
      allowJoinAfterStart: legacyBoolean(),
      description: String,
      slots: Number,
      humans: Number,
      /* players: [
        {
          steamId: String,
          civType: String,
          hasSurrendered: Boolean,
          surrenderDate: Date,
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
      ], */
      players: {
        // Legacy complex array, see above
        type: String,
        get: (value: string) =>
          (value ? JSON.parse(value) : []).map(x => ({
            ...x,
            firstTurnEndDate: x.firstTurnEndDate ? new Date(x.firstTurnEndDate) : undefined,
            lastTurnEndDate: x.lastTurnEndDate ? new Date(x.lastTurnEndDate) : undefined
          })),
        pydtSet: (value: GamePlayer[]) => {
          return JSON.stringify(
            (value || []).map(x => ({
              ...x,
              turnsPlayed: x.turnsPlayed || 0,
              turnsSkipped: x.turnsSkipped || 0,
              timeTaken: x.timeTaken || 0,
              fastTurns: x.fastTurns || 0,
              slowTurns: x.slowTurns || 0
            }))
          );
        }
      },
      discourseTopicId: {
        type: Number,
        index: {
          global: true
        }
      },
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
      latestDiscoursePostUser: String,
      firstTurnEndDate: Date,
      lastTurnEndDate: Date,
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
      },
      hourOfDayQueue: {
        type: String
      },
      dayOfWeekQueue: {
        type: String
      },
      turnLengthBuckets: {
        type: String,
        get: (value: string) => (value ? JSON.parse(value) : {}),
        pydtSet: (value: Record<number, number>) => JSON.stringify(value)
      },
      yearBuckets: {
        type: String,
        get: (value: string) => (value ? JSON.parse(value) : {}),
        pydtSet: (value: Record<number, number>) => JSON.stringify(value)
      },
      clonedFromGameId: String,
      allowDuplicateLeaders: Boolean,
      randomOnly: {
        type: String,
        get: value => {
          if (value === 'true') {
            return 'FORCE_RANDOM';
          } else if (value === 'false') {
            return 'EITHER';
          }

          return value;
        }
      },
      webhookUrl: String,
      resetGameStateOnNextUpload: legacyBoolean(),
      finalized: Boolean,
      gameVideoUrl: String,
      turnTimerVacationHandling: String
    });
  }

  async get(id: string, consistent?: boolean) {
    return this.setDefaults(await super.get(id, consistent));
  }

  allGames(): Promise<Game[]> {
    return this.getAllPaged(this.scan());
  }

  public getGamesForUser(user: User): Promise<Game[]> {
    const gameKeys = user.activeGameIds || [];

    if (gameKeys.length > 0) {
      return this.batchGet(gameKeys);
    } else {
      return Promise.resolve([]);
    }
  }

  public getCompletedGamesForUser(user: User): Promise<Game[]> {
    const gameKeys = user.inactiveGameIds || [];

    if (gameKeys.length > 0) {
      return this.batchGet(gameKeys);
    } else {
      return Promise.resolve([]);
    }
  }

  async batchGet(ids: string[], consistent?: boolean) {
    const games = await super.batchGet(ids, consistent);
    return orderBy(games, ['createdAt'], ['desc']).map(g => this.setDefaults(g));
  }

  async incompleteGames() {
    const games = await this.getAllPaged(this.query('completed').eq('false'));
    // Index is KEYS_ONLY, need to get full games
    return this.batchGet(games.map(x => x.gameId));
  }

  async unstartedGames(daysOld: number) {
    const games = await this.getAllPaged(
      this.query('inProgress')
        .eq('false')
        .where('createdAt')
        .lt(
          moment()
            .add(daysOld * -1, 'days')
            .valueOf()
        )
    );

    // Index is KEYS_ONLY, need to get full games
    return this.batchGet(games.map(x => x.gameId));
  }

  async getByDiscourseTopicId(topicId: number) {
    const topics = await this.getAllPaged(this.query('discourseTopicId').eq(topicId));

    if (!topics.length) {
      return null;
    }

    // Index is KEYS_ONLY, need to get full game
    return this.get(topics[0].gameId, true);
  }

  // TODO: Add index?  Not sure if this is a big enough deal to index yet
  async getByClonedFromGameId(gameId: string) {
    const clonedGames = await this.getAllPaged(
      this.scan().where('clonedFromGameId').eq(gameId).limit(1)
    );
    return clonedGames[0];
  }

  private setDefaults(game: Game) {
    if (game) {
      game.gameType = game.gameType || CIV6_GAME.id;
      game.turnTimerVacationHandling = game.turnTimerVacationHandling || 'SKIP_AFTER_TIMER';
    }

    return game;
  }
}
