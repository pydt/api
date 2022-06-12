import { Config } from './config';
import { HTTP_REQUEST_PROVIDER_SYMBOL, IHttpRequestProvider } from './httpRequestProvider';
import { inject, provideSingleton } from './ioc';
import { pydtLogger } from './logging';
import { Game } from './models';

export const DISCOURSE_PROVIDER_SYMBOL = Symbol('IDiscourseProvider');

export interface IDiscourseProvider {
  addGameTopic(game: Game, firstTimeHosting?: boolean): Promise<DiscourseTopic>;
  deleteGameTopic(game: Game): Promise<void>;
}

@provideSingleton(DISCOURSE_PROVIDER_SYMBOL)
export class DiscourseProvider implements IDiscourseProvider {
  constructor(@inject(HTTP_REQUEST_PROVIDER_SYMBOL) private http: IHttpRequestProvider) {}

  public async addGameTopic(game: Game, firstTimeHosting?: boolean) {
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
          raw: `Smack talk goes here for ${
            game.displayName
          }!  Game URL: https://playyourdamnturn.com/game/${game.gameId} ${
            firstTimeHosting
              ? `

---

**It looks like this is your first time hosting a game, welcome!**

:spiral_notepad: [How to create your PYDT game](https://discourse.playyourdamnturn.com/t/how-to-setup-a-game-with-pydt/6486)

:tv: [See a quick youtube video of PYDT](https://www.youtube.com/watch?v=L4PeMesClTI)

:speaking_head: [Join our quiet discord. Help, News and New Games](https://discord.gg/CYhHSzv)

**If you need help, [Post in Game Support](https://discourse.playyourdamnturn.com/c/game-support) or come to discord! :+1:**`
              : ''
          }`,
          category: 5
        },
        json: true
      });
    } else {
      pydtLogger.info(
        `Ignoring request to create discourse topic for game ${game.displayName}, stage is ${Config.activeStage}`
      );
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
      pydtLogger.info(
        `Ignoring request to delete discourse topic for game ${game.displayName}, stage is ${Config.activeStage}`
      );
    }
  }
}

export interface DiscourseTopic {
  topic_id: number;
}
