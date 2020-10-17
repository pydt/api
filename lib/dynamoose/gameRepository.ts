import { orderBy } from 'lodash';
import * as moment from 'moment';
import { Config } from '../config';
import { provideSingleton } from '../ioc';
import { Game, User } from '../models';
import { BaseDynamooseRepository, IRepository } from './common';
import { CIV6_GAME } from '../metadata/civGames/civ6';

export const GAME_REPOSITORY_SYMBOL = Symbol('IGameRepository');

export interface IGameRepository extends IRepository<string, Game> {
  getGamesForUser(user: User): Promise<Game[]>;
  getCompletedGamesForUser(user: User): Promise<Game[]>;
  incompleteGames(): Promise<Game[]>;
  unstartedGames(daysOld: number): Promise<Game[]>;
  getByDiscourseTopicId(topicId: number): Promise<Game>;
}

@provideSingleton(GAME_REPOSITORY_SYMBOL)
export class GameRepository extends BaseDynamooseRepository<string, Game> implements IGameRepository {
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
      latestDiscoursePostUser: String,
      lastTurnEndDate: Date,
      randomOnly: Boolean,
      webhookUrl: String
    });
  }

  async get(id: string, consistent?: boolean) {
    return this.setDefaults(await super.get(id, consistent));
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
    const games = await this.getAllPaged(this.scan('completed').not().eq(true));
    return games.map(g => this.setDefaults(g));
  }

  async unstartedGames(daysOld: number) {
    const games = await this.getAllPaged(
      this.scan('inProgress')
        .not()
        .eq(true)
        .where('createdAt')
        .lt(
          moment()
            .add(daysOld * -1, 'days')
            .valueOf()
        )
    );

    return games.map(g => this.setDefaults(g));
  }

  async getByDiscourseTopicId(topicId: number) {
    const topics = await this.getAllPaged(this.scan('discourseTopicId').eq(topicId));

    if (!topics) {
      return null;
    }

    return this.setDefaults(topics[0]);
  }

  private setDefaults(game: Game) {
    if (game) {
      game.gameType = game.gameType || CIV6_GAME.id;
    }

    return game;
  }
}
