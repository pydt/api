'use strict';

const common = require('../common.js');
const dynamoose = require('./common.js');

const User = dynamoose.createVersionedModel(common.config.RESOURCE_PREFIX + 'user', {
  steamId: {
    type: String,
    hashKey: true
  },
  displayName: {
    type: String,
    required: true
  },
  emailAddress: String,
  activeGameIds: [String],
  inactiveGameIds: [String]
});

User.createS3GameCacheKey = (steamId) => {
  return steamId + '/' + 'gameCache.json';
};

module.exports = User;
