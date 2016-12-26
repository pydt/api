'use strict';

const common = require('./common');
const rp = require('request-promise');

module.exports.addGameTopic = (game) => {
  if (common.config.SERVERLESS_STAGE === 'prod') {
    return rp({
      method: 'POST',
      uri: `https://discourse.playyourdamnturn.com/posts/?api_key=${common.config.DISCOURSE_API_KEY}&api_username=system`,
      form: {
        title: `${game.displayName} (${game.gameId.substring(0, 8)})`,
        raw: `Smack talk goes here for ${game.displayName}!  Game URL: https://playyourdamnturn.com/game/${game.gameId}`,
        category: 5
      },
      json: true
    });
  } else {
    console.log(`Ignoring request to create discourse topic for game ${game.displayName}, stage is ${common.config.SERVERLESS_STAGE}`);
    return Promise.resolve();
  }
};

module.exports.deleteGameTopic = (game) => {
  if (common.config.SERVERLESS_STAGE === 'prod') {
    return rp({
      method: 'DELETE',
      uri: `https://discourse.playyourdamnturn.com/t/${game.discourseTopicId}?api_key=${common.config.DISCOURSE_API_KEY}&api_username=system`,
      json: true
    });
  } else {
    console.log(`Ignoring request to delete discourse topic for game ${game.displayName}, stage is ${common.config.SERVERLESS_STAGE}`);
    return Promise.resolve();
  }
};
