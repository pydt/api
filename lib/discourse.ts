import * as rp from 'request-promise';
import { Config } from './config';
import { Game } from './models';
import * as winston from 'winston';

export function addDiscourseGameTopic(game: Game) {
  if (Config.activeStage() === 'prod') {
    return rp({
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
    winston.info(`Ignoring request to create discourse topic for game ${game.displayName}, stage is ${Config.activeStage()}`);
    return Promise.resolve();
  }
};

export function deleteDiscourseGameTopic(game: Game) {
  if (Config.activeStage() === 'prod') {
    return rp({
      method: 'DELETE',
      uri: `https://discourse.playyourdamnturn.com/t/${game.discourseTopicId}?api_key=${Config.discourseApiKey()}&api_username=system`,
      json: true
    });
  } else {
    winston.info(`Ignoring request to delete discourse topic for game ${game.displayName}, stage is ${Config.activeStage()}`);
    return Promise.resolve();
  }
};
