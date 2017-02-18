'use strict';

const _ = require('lodash');
const rp = require('request-promise');
const steam = require('../../lib/steam.js');
const User = require('../../lib/dynamoose/User.js');

module.exports.handler = (event, context, cb) => {
  const usersToUpdate = [];

  User.scan().exec().then(users => {
    return Promise.all(_.map(_.chunk(users, 75), chunk => {
      const steamIds = _.map(chunk, 'steamId');

      return steam.getPlayerSummaries(_.join(steamIds)).then(summaries => {
        const players = summaries.response.players;

        for (let user of chunk) {
          const curPlayer = _.find(players, player => {
            return user.steamId === player.steamid;
          });

          let isDirty = possiblyUpdateValue(user, 'displayName', curPlayer.personaname);
          isDirty |= possiblyUpdateValue(user, 'avatarSmall', curPlayer.avatar);
          isDirty |= possiblyUpdateValue(user, 'avatarMedium', curPlayer.avatarmedium);
          isDirty |= possiblyUpdateValue(user, 'avatarFull', curPlayer.avatarfull);

          if (isDirty) {
            console.log(`Updating ${user.displayName}...`);
            usersToUpdate.push(user);
          }
        }
      });
    }));
  })
  .then(() => {
    return Promise.each(_.map(usersToUpdate, user => {
      return User.saveVersioned(user);
    }));
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};

////////

function possiblyUpdateValue(source, sourceProp, newValue) {
  if (source[sourceProp] === newValue) {
    return false;
  }

  source[sourceProp] = newValue;

  return true;
}