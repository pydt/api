import * as AWS from 'aws-sdk';
import { provideSingleton } from './ioc';
const sns = new AWS.SNS();
const sts = new AWS.STS();

export const SNS_PROVIDER_SYMBOL = Symbol('ISnsProvider');

export interface ISnsProvider {
  sendMessage(topic: string, subject: string, message: string): Promise<any>;
}

@provideSingleton(SNS_PROVIDER_SYMBOL)
export class SnsProvider implements ISnsProvider {
  public async sendMessage(topic: string, subject: string, message: string) {
    const identity = await sts.getCallerIdentity({}).promise();

    const params = {
      Message: message,
      Subject: subject,
      TopicArn: 'arn:aws:sns:us-east-1:' + identity.Account + ':' + topic
    };

    return sns.publish(params).promise();
  }
}
