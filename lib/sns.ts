import * as AWS from 'aws-sdk';
const sns = new AWS.SNS();
const sts = new AWS.STS();

export async function sendSnsMessage(topic: string, subject: string, message: string) {
  const identity = await sts.getCallerIdentity({}).promise();

  const params = {
    Message: message,
    Subject: subject,
    TopicArn: 'arn:aws:sns:us-east-1:' + identity.Account + ':' + topic
  };

  return sns.publish(params).promise();
};
