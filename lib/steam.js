'use strict';

const rp = require('request-promise');

module.exports.apiKey = '***REMOVED***';

module.exports.getPlayerSummaries = (steamIds) => {
  return rp({
    uri: 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' + module.exports.apiKey + '&steamids=' + steamIds,
    json: true
  });
};
