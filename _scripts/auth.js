'use strict';

const jwt = require('jsonwebtoken');

module.exports.sign = (steamid) => {
  return jwt.sign(steamid, process.env.JWT_SECRET);
};