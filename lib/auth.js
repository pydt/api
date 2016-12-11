'use strict';

const jwt = require('jsonwebtoken');
const common = require('./common');

module.exports.sign = (steamid) => {
  return jwt.sign(steamid, common.config.JWT_SECRET);
};

module.exports.getSteamIDFromToken = (token) => {
  return jwt.verify(token, common.config.JWT_SECRET);
};
