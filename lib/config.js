'use strict';

require('dotenv').config();

require('dynamoose').setDefaults({
  create: false
});

module.exports = {
  SERVERLESS_STAGE: process.env.SERVERLESS_STAGE,
  TABLE_PREFIX: process.env.TABLE_PREFIX
};
