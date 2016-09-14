'use strict';

const SteamStrategy = require('passport-steam').Strategy;
const passport = require('passport');

passport.use(new SteamStrategy({
    returnURL: 'http://localhost:8080/steamreturn',
    realm: 'http://localhost:8080/',
    apiKey: '***REMOVED***'
  },
  function(identifier, profile, done) {
    done(null, {
      identifier: identifier,
      profile: profile
    });
  }
));

module.exports = passport;
