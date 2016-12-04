'use strict';

const common = require('../../../lib/common.js');
const querystring = require('querystring');
const auth = require('../../../lib/auth.js');
const steamPassport = require('../../../lib/steamPassport.js');
const User = require('../../../lib/dynamoose/User.js');

module.exports.handler = (event, context, cb) => {
  let req = {
    query: event.query,
    url: '/blah?' + querystring.stringify(event.query)
  };
  let res = {
    setHeader: (key, value) => {
      if (key === 'Location') {
        // We shouldn't get here in validate...
        cb(new Error('[400] Bad Request'));
      }
    }
  };
  let next = () => {
    // We shouldn't get here in validate...
    cb(new Error('[400] Bad Request'));
  };

  steamPassport.authenticate('steam', (err, user, info) => {
    if (err) {
      common.generalError(cb, err);
    } else {
      User.get(user.profile.id).then(dbUser => {
        if (!dbUser) {
          dbUser = new User({steamId: user.profile.id});
        }

        dbUser.displayName = user.profile.displayName;
        return User.saveVersioned(dbUser);
      }).then(() => {
        cb(null, {
          token: auth.sign(user.profile.id),
          steamProfile: user.profile._json
        });
      }).catch(err => {
        common.generalError(cb, err);
      });
    }
  })(req, res, next);
};
