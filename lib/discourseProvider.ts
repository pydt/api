import { Config } from './config';
import { HTTP_REQUEST_PROVIDER_SYMBOL, IHttpRequestProvider } from './httpRequestProvider';
import { inject, provideSingleton } from './ioc';
import { pydtLogger } from './logging';
import { Game } from './models';

export const DISCOURSE_PROVIDER_SYMBOL = Symbol('IDiscourseProvider');

export interface IDiscourseProvider {
  addGameTopic(game: Game): Promise<DiscourseTopic>;
  deleteGameTopic(game: Game): Promise<void>;
}

@provideSingleton(DISCOURSE_PROVIDER_SYMBOL)
export class DiscourseProvider implements IDiscourseProvider {
  constructor(@inject(HTTP_REQUEST_PROVIDER_SYMBOL) private http: IHttpRequestProvider) {}

  public async addGameTopic(game: Game) {
    if (Config.activeStage === 'prod') {
      return await this.http.request({
        method: 'POST',
        headers: {
          'Api-Key': Config.discourseApiKey,
          'Api-Username': 'system'
        },
        uri: `https://discourse.playyourdamnturn.com/posts`,
        form: {
          title: `${game.displayName} (${game.gameId.substring(0, 8)})`,
          raw: `Smack talk goes here for ${game.displayName}!  Game URL: https://playyourdamnturn.com/game/${game.gameId}`,
          category: 5
        },
        json: true
      });
    } else {
      pydtLogger.info(`Ignoring request to create discourse topic for game ${game.displayName}, stage is ${Config.activeStage}`);
    }
  }

  public async deleteGameTopic(game: Game) {
    if (Config.activeStage === 'prod') {
      return await this.http.request({
        method: 'DELETE',
        headers: {
          'Api-Key': Config.discourseApiKey,
          'Api-Username': 'system'
        },
        uri: `https://discourse.playyourdamnturn.com/t/${game.discourseTopicId}`,
        json: true
      });
    } else {
      pydtLogger.info(`Ignoring request to delete discourse topic for game ${game.displayName}, stage is ${Config.activeStage}`);
    }
  }
}

export interface DiscourseTopic {
  topic_id: number;
}
