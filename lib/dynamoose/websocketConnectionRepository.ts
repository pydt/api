import { Config } from '../config';
import { provideSingleton } from '../ioc';
import { WebsocketConnection, WebsocketConnectionKey } from '../models';
import { BaseDynamooseRepository, IRepository } from './common';

export const WEBSOCKET_CONNECTION_REPOSITORY_SYMBOL = Symbol('IWebsocketConnectionRepository');

export interface IWebsocketConnectionRepository extends IRepository<WebsocketConnectionKey, WebsocketConnection> {
  getByConnectionId(connectionId: string): Promise<WebsocketConnection>;
}

@provideSingleton(WEBSOCKET_CONNECTION_REPOSITORY_SYMBOL)
export class WebsocketConnectionRepository
  extends BaseDynamooseRepository<WebsocketConnectionKey, WebsocketConnection>
  implements IWebsocketConnectionRepository
{
  constructor() {
    super(Config.resourcePrefix + 'websocket-connection', {
      connectionId: {
        type: String,
        hashKey: true
      },
      steamId: String,
      establishedDate: Date
    });
  }

  async getByConnectionId(connectionId: string) {
    const result = await this.scan('connectionId').eq(connectionId).limit(1).exec();
    return result.length ? result[0] : null;
  }
}
