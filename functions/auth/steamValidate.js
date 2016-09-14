'use strict';

const querystring = require('querystring');
const auth = require('../../lib/auth.js');
const steamPassport = require('../../lib/steamPassport.js');
const db = require('../../lib/dynamodb.js');

module.exports.handler = (event, context, cb) => {
  let req = {
    query: event.query,
    url: '/blah?' + querystring.stringify(event.query)
  };
  let res = {
    setHeader: (key, value) => {
      if (key === 'Location') {
        cb(null, { message: 'failed...' + value });
      }
    }
  };
  let next = () => {};

  steamPassport.authenticate('steam', { failureRedirect: '/fail' }, (err, user, info) => {
    if (err) {
      cb(err);
    } else {
      db.saveUser(user, (err, res) => {
        if (err) {
          cb(err);
        } else {
          cb(null, {
            token: auth.sign(user.profile.id),
            user: user
          });
        }
      });
    }
  })(req, res, next);
};
