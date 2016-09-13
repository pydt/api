require('dotenv').config();

const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_PREFIX = process.env.SERVERLESS_STAGE + '-';

module.exports.saveUser = (user, cb) => {
  db.update({
    TableName: TABLE_PREFIX + 'civx-user',
    Key: {
      'SteamID': user.profile.id,
    },
    UpdateExpression: "SET DisplayName =:displayName",
    ExpressionAttributeValues: {
      ":displayName": user.profile.displayName
     }
  }, cb);
};
