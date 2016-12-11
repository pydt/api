'use strict';

const rp = require('request-promise');
const common = require('./common');

module.exports.getPlayerSummaries = (steamIds) => {
  return rp({
    uri: 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' + common.config.STEAM_API_KEY + '&steamids=' + steamIds,
    json: true
  });
};
