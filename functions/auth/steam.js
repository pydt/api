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

module.exports.authenticate = (event, context, cb) => {
  let location = null;

  // Since passport expects to work with something like express,
  // mock the req/res/next middleware format...
  let req = {};
  let res = {
    setHeader: (key, value) => {
      if (key === 'Location') {
        location = value;
      }
    },
    end: () => {
      cb(null, {
        redirectURL: location
      });
    }
  };
  let next = () => {};

  passport.authenticate('steam')(req, res, next);
};

module.exports.validate = (event, context, cb) => {
  cb(null, { message: 'You called validate.' });
};
