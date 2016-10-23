'use strict';

const steamPassport = require('../../lib/steamPassport.js');

module.exports.handler = (event, context, cb) => {
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

  steamPassport.authenticate('steam', (err, user, info) => {
    if (err) {
      return cb(err);
    } else {
      console.log('Callback called without error?', user, info);
    }
  })(req, res, next);
};
