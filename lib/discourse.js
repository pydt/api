'use strict';

const common = require('./common');
const rp = require('request-promise');
module.exports.apiKey = '***REMOVED***';

module.exports.addGameTopic = (game) => {
  if (common.config.SERVERLESS_STAGE === 'prod') {
    return rp({
      method: 'POST',
      uri: `https://discourse.playyourdamnturn.com/posts/?api_key=${module.exports.apiKey}&api_username=system`,
      form: {
        title: `${game.displayName} (${game.gameId.substring(0, 8)})`,
        raw: `Smack talk goes here for ${game.displayName}!  Game URL: https://playyourdamnturn.com/game/${game.gameId}`,
        category: 5
      }
    });
  } else {
    console.log(`Ignoring request to create discourse topic for game ${game.displayName}, stage is ${common.config.SERVERLESS_STAGE}`);
    return Promise.resolve();
  }
};
