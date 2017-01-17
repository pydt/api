'use strict';

require('buffer-v6-polyfill');

const common = require('../../lib/common.js');
const moment = require('moment');
const treehash = require('treehash');
const _ = require('lodash');
const fs = require('fs');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const glacier = new AWS.Glacier();

const PART_SIZE = 8388608;
const VAULT_NAME = 'PYDT_Backups';

var packer = require('zip-stream');
var thStream = treehash.createTreeHashStream();

module.exports.handler = (event, context, cb) => {
  const archive = new packer();
  let glacierComplete;

  glacier.initiateMultipartUpload({
    vaultName: VAULT_NAME,
    archiveDescription: common.config.RESOURCE_PREFIX + 'saves_' + moment().format('YYYYMMDDHHmm') + '.zip',
    partSize: PART_SIZE.toString()
  })
  .promise()
  .then(mp => {
    let zippedData = Buffer.alloc(0);
    let glacierPart = 0;
    let glacierChain = Promise.resolve();

    glacierComplete = new Promise((resolve, reject) => {
      archive
        .on('data', chunk => {
          zippedData = Buffer.concat([zippedData, chunk]);
          thStream.update(chunk);

          if (zippedData.length >= PART_SIZE) {
            const toUpload = zippedData.slice(0, PART_SIZE);
            glacierChain = glacierChain.then(() => {
              return uploadGlacierPart(mp.uploadId, glacierPart++, toUpload);
            })
            .catch(err => {
              reject(err);
            });

            zippedData = zippedData.slice(PART_SIZE);
          }
        })
        .on('error', err => {
          reject(err);
        })
        .on('end', () => {
          if (zippedData.length > 0) {
            glacierChain = glacierChain.then(() => {
              return uploadGlacierPart(mp.uploadId, glacierPart, zippedData);
            }).then(() => {
              return glacier.completeMultipartUpload({
                vaultName: VAULT_NAME,
                uploadId: mp.uploadId,
                archiveSize: (glacierPart * PART_SIZE + zippedData.length).toString(),
                checksum: thStream.digest()
              }).promise();
            }).then(data => {
              console.log('upload completed, archive id: ' + data.archiveId + ', checksum: ' + data.checksum);
              resolve();
            })
            .catch(err => {
              reject(err);
            });
          }
        });
    });

    return getAllObjects().then(keys => {
      return Promise.each(keys, key => {
        console.log(key);
        return s3.getObject({
          Bucket: common.config.RESOURCE_PREFIX + 'saves',
          Key: key
        })
        .promise()
        .then(resp => {
          if (!resp && !resp.Body) {
            throw new Error(`File doesn't exist?`);
          }

          return new Promise((resolve, reject) => {
            archive.entry(resp.Body, { name: key }, (err, entry) => {
              if (err) {
                return reject(err);
              }

              resolve();
            });
          });
        })
      });
    })
  })
  .then(() => {
    archive.finish();
    return glacierComplete;
  })
  .then(() => {
    console.log('Done!');
  })
  .catch(err => {
    console.log(err);
    common.generalError(cb, err);
  });
};

function uploadGlacierPart(uploadId, part, buffer) {
  console.log('starting upload for part ' + part)
  const startBytes = part * PART_SIZE;
  
  return glacier.uploadMultipartPart({
    vaultName: VAULT_NAME,
    uploadId: uploadId,
    range: 'bytes ' + startBytes + '-' + (startBytes + buffer.length - 1) + '/*',
    body: buffer
  }).promise().then(() => {
    console.log('part ' + part + ' uploaded!');
  })
}

function getAllObjects(continuationToken) {
  return s3.listObjectsV2({
    Bucket: common.config.RESOURCE_PREFIX + 'saves',
    ContinuationToken: continuationToken
  })
  .promise()
  .then(resp => {
    if (!resp || !resp.Contents) {
      throw new Error(`No data returned for listObjectsV2`);
    }

    const result = _.map(resp.Contents, content => { return content.Key; });

    if (resp.IsTruncated) {
      return getAllObjects(resp.NextContinuationToken).then(keys => {
        return result.concat(keys);
      });
    } else {
      return result;
    }
  })
}