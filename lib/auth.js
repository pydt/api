'use strict';

const jwt = require('jsonwebtoken');
const secret = "***REMOVED***";

module.exports.sign = (steamid) => {
  return jwt.sign(steamid, secret);
};

module.exports.getSteamIDFromToken = (token) => {
  return jwt.verify(token, secret);
};
