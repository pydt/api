import { provideSingleton } from './ioc';
import { User } from './models';
import * as AWS from 'aws-sdk';

export const IOT_PROVIDER_SYMBOL = Symbol('IIotProvider');

export interface IIotProvider {
  notifyUserClient(user: User): Promise<any>;
}

@provideSingleton(IOT_PROVIDER_SYMBOL)
export class IotProvider implements IIotProvider {
  private iotData: AWS.IotData;

  constructor() {
    this.iotData = new AWS.IotData({endpoint: 'a21s639tnrshxf.iot.us-east-1.amazonaws.com'});
  }

  public notifyUserClient(user: User) {
    return this.iotData.publish({
      topic: `/pydt/${process.env.SERVERLESS_STAGE}/user/${user.steamId}/gameupdate`,
      payload: 'Hello!',
      qos: 0
    }).promise();
  }
}
