import { Config } from './config';
import { HTTP_REQUEST_PROVIDER_SYMBOL, IHttpRequestProvider } from './httpRequestProvider';
import { inject, provideSingleton } from './ioc';
import { pydtLogger } from './logging';
import { Game } from './models';

export const DISCOURSE_PROVIDER_SYMBOL = Symbol('IDiscourseProvider');

export interface IDiscourseProvider {
  addGameTopic(game: Game, firstTimeHosting?: boolean): Promise<DiscourseTopic>;
  deleteGameTopic(game: Game): Promise<void>;
  postToSmack(topicId: number, message: string): Promise<void>;
}

@provideSingleton(DISCOURSE_PROVIDER_SYMBOL)
export class DiscourseProvider implements IDiscourseProvider {
  constructor(@inject(HTTP_REQUEST_PROVIDER_SYMBOL) private http: IHttpRequestProvider) {}

  public async postToSmack(topicId: number, message: string) {
    if (Config.activeStage === 'prod') {
      await this.http.fetch(`https://discourse.playyourdamnturn.com/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': Config.discourseApiKey,
          'Api-Username': 'system'
        },
        body: JSON.stringify({
          topic_id: topicId,
          raw: message
        })
      });
    }
  }

  public async addGameTopic(game: Game, firstTimeHosting?: boolean) {
    if (Config.activeStage === 'prod') {
      const topic = await this.http.fetch<{ topic_id: number }>(
        `https://discourse.playyourdamnturn.com/posts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': Config.discourseApiKey,
            'Api-Username': 'system'
          },
          body: JSON.stringify({
            title: `${game.displayName} (${game.gameId.substring(0, 8)})`,
            raw: `Smack talk goes here for ${game.displayName}!  Game URL: https://playyourdamnturn.com/game/${game.gameId}`,
            category: 5
          })
        }
      );

      await this.postToSmack(
        topic.topic_id,
        `${firstTimeHosting ? '**It looks like this is your first time hosting a game, welcome!**' : ''}

:thinking: [How to Play Your Damn Turn](https://discourse.playyourdamnturn.com/t/how-to-play-your-damn-turn/8723)

:spiral_notepad: [How to create your PYDT game](https://discourse.playyourdamnturn.com/t/how-to-setup-a-game-with-pydt/6486)

:tv: [See a quick youtube video of PYDT](https://www.youtube.com/watch?v=L4PeMesClTI)

:speaking_head: [Join our quiet discord. Help, News and New Games](https://discord.gg/CYhHSzv)

**If you need help, [Post in Game Support](https://discourse.playyourdamnturn.com/c/game-support) or come to [discord](https://discord.gg/CYhHSzv)! :+1:**`
      );

      return topic;
    } else {
      pydtLogger.info(
        `Ignoring request to create discourse topic for game ${game.displayName}, stage is ${Config.activeStage}`
      );
    }
  }

  public async deleteGameTopic(game: Game) {
    if (Config.activeStage === 'prod') {
      return await this.http.fetch<void>(
        `https://discourse.playyourdamnturn.com/t/${game.discourseTopicId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': Config.discourseApiKey,
            'Api-Username': 'system'
          }
        },
        true
      );
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
