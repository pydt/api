import { provideSingleton } from './ioc';
import { HasSteamId } from './models';
import { AWS } from './config';

export const IOT_PROVIDER_SYMBOL = Symbol('IIotProvider');

export interface IIotProvider {
  notifyUserClient(user: HasSteamId): Promise<void>;
}

@provideSingleton(IOT_PROVIDER_SYMBOL)
export class IotProvider implements IIotProvider {
  private iotData: AWS.IotData;

  constructor() {
    this.iotData = new AWS.IotData({ endpoint: 'a21s639tnrshxf-ats.iot.us-east-1.amazonaws.com' });
  }

  public async notifyUserClient(user: HasSteamId) {
    await this.iotData
      .publish({
        topic: `/pydt/${process.env.SERVERLESS_STAGE}/user/${user.steamId}/gameupdate`,
        payload: 'Hello!',
        qos: 0
      })
      .promise();
  }
}
