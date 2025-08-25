'use strict';

const jwt = require('jsonwebtoken');

module.exports.sign = (steamId, rawNonce) => {
  const nonce = rawNonce ? parseInt(rawNonce, 10) : -1;

  return jwt.sign(
    {
      steamId,
      nonce
    },
    process.env.JWT_SECRET
  );
};
