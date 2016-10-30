'use strict';

const SteamStrategy = require('passport-steam').Strategy;
const passport = require('passport');
const steam = require('./steam.js');
const common = require('./common.js');

passport.use(new SteamStrategy({
    returnURL: common.config.WEB_URL + '/steamreturn',
    realm: common.config.WEB_URL,
    apiKey: steam.apiKey
  },
  function(identifier, profile, done) {
    done(null, {
      identifier: identifier,
      profile: profile
    });
  }
));

module.exports = passport;
