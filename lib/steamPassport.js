'use strict';

const SteamStrategy = require('passport-steam').Strategy;
const passport = require('passport');
const steam = require('./steam.js');

passport.use(new SteamStrategy({
    returnURL: 'http://localhost:8080/steamreturn',
    realm: 'http://localhost:8080/',
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
