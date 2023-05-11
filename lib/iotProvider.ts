import {
  IoTDataPlaneClient,
  PayloadFormatIndicator,
  PublishCommand
} from '@aws-sdk/client-iot-data-plane';
import { provideSingleton } from './ioc';
import { HasSteamId } from './models';

export const IOT_PROVIDER_SYMBOL = Symbol('IIotProvider');

export interface IIotProvider {
  notifyUserClient(user: HasSteamId): Promise<void>;
}

@provideSingleton(IOT_PROVIDER_SYMBOL)
export class IotProvider implements IIotProvider {
  private iotData: IoTDataPlaneClient;

  constructor() {
    this.iotData = new IoTDataPlaneClient({
      endpoint: 'https://a21s639tnrshxf-ats.iot.us-east-1.amazonaws.com'
    });
  }

  public async notifyUserClient(user: HasSteamId) {
    await this.iotData.send(
      new PublishCommand({
        topic: `/pydt/${process.env.SERVERLESS_STAGE}/user/${user.steamId}/gameupdate`,
        payload: Buffer.from('Hello!'),
        payloadFormatIndicator: PayloadFormatIndicator.UTF8_DATA,
        qos: 0
      })
    );
  }
}
