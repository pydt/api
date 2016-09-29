'use strict';

const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const sts = new AWS.STS();

module.exports.sendMessage = (topic, subject, message) => {
  return new Promise((resolve, reject) => {
    sts.getCallerIdentity({}, (err, data) => {
      if (err) {
        return reject(err);
      }

      const params = {
        Message: message,
        Subject: subject,
        TopicArn: 'arn:aws:sns:us-east-1:' + data.Account + ':' + topic
      };

      sns.publish(params, (err, data) => {
        if (err) {
          return reject(err);
        }

        resolve(data);
      });
    })
  });
};
