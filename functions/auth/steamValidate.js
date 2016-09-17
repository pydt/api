'use strict';

const querystring = require('querystring');
const auth = require('../../lib/auth.js');
const steamPassport = require('../../lib/steamPassport.js');
const User = require('../../lib/dynamoose/User.js');

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

  steamPassport.authenticate('steam', { failureRedirect: '/fail' }, (err, resp, info) => {
    if (err) {
      cb(err);
    } else {
      User.get(resp.profile.id).then(dbUser => {
        if (!dbUser) {
          dbUser = new User({steamId: resp.profile.id});
        }

        dbUser.displayName = resp.profile.displayName;
        return User.saveVersioned(dbUser);
      }).then(() => {
        cb(null, {
          token: auth.sign(resp.profile.id),
          steamProfile: resp.profile._json
        });
      }).catch(err => {
        cb(err);
      });
    }
  })(req, res, next);
};
