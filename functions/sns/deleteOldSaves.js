'use strict';

const common = require('../../lib/common.js');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const _ = require('lodash');

const TURNS_TO_SAVE = 40;

module.exports.handler = (event, context, cb) => {
  const gameId = event.Records[0].Sns.Message;
  
  return s3.listObjectsV2({
    Bucket: common.config.RESOURCE_PREFIX + 'saves',
    Prefix: gameId
  })
  .promise()
  .then(resp => {
    if (!resp || !resp.Contents) {
      throw new Error(`No data returned for listObjectsV2, prefix: ${gameId}`);
    }

    if (resp.Contents.length > TURNS_TO_SAVE) {
      return s3.deleteObjects({
        Bucket: common.config.RESOURCE_PREFIX + 'saves',
        Delete: {
          Objects: _.chain(resp.Contents)
            .orderBy(['Key'], ['asc'])
            .take(resp.Contents.length - TURNS_TO_SAVE)
            .map(obj => {
              return {
                Key: obj.Key
              }
            })
            .value()
        }
      }).promise();
    }
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};
