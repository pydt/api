import { Config } from './config';
import { Game } from './models';
import { pydtLogger } from './logging';
import { provideSingleton } from './ioc';
import * as rp from 'request-promise';

export const DISCOURSE_PROVIDER_SYMBOL = Symbol('IDiscourseProvider');

export interface IDiscourseProvider {
  addGameTopic(game: Game): Promise<any>;
  deleteGameTopic(game: Game): Promise<any>;
}

@provideSingleton(DISCOURSE_PROVIDER_SYMBOL)
export class DiscourseProvider implements IDiscourseProvider {
  public async addGameTopic(game: Game) {
    if (Config.activeStage() === 'prod') {
      await rp({
        method: 'POST',
        uri: `https://discourse.playyourdamnturn.com/posts/?api_key=${Config.discourseApiKey()}&api_username=system`,
        form: {
          title: `${game.displayName} (${game.gameId.substring(0, 8)})`,
          raw: `Smack talk goes here for ${game.displayName}!  Game URL: https://playyourdamnturn.com/game/${game.gameId}`,
          category: 5
        },
        json: true
      });
    } else {
      pydtLogger.info(`Ignoring request to create discourse topic for game ${game.displayName}, stage is ${Config.activeStage()}`);
    }
  }

  public async deleteGameTopic(game: Game) {
    if (Config.activeStage() === 'prod') {
      await rp({
        method: 'DELETE',
        uri: `https://discourse.playyourdamnturn.com/t/${game.discourseTopicId}?api_key=${Config.discourseApiKey()}&api_username=system`,
        json: true
      });
    } else {
      pydtLogger.info(`Ignoring request to delete discourse topic for game ${game.displayName}, stage is ${Config.activeStage()}`);
    }
  }
}
