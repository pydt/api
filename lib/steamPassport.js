'use strict';

const SteamStrategy = require('passport-steam').Strategy;
const passport = require('passport');
const steam = require('./steam.js');
const config = require('./config.js');

passport.use(new SteamStrategy({
    returnURL: config.WEB_URL + '/#/steamreturn',
    realm: config.WEB_URL,
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
