import { IPrivateUserDataRepository, PRIVATE_USER_DATA_REPOSITORY_SYMBOL } from './dynamoose/privateUserDataRepository';
import { IWebsocketConnectionRepository, WEBSOCKET_CONNECTION_REPOSITORY_SYMBOL } from './dynamoose/websocketConnectionRepository';
import { inject, provideSingleton } from './ioc';
import { PrivateUserData } from './models';

export const WEBSOCKET_PROVIDER_SYMBOL = Symbol('IWebsocketProvider');

export interface IWebsocketProvider {
  registerUser(steamId: string, connectionId: string): Promise<void>;
  unregisterUser(connectionId: string): Promise<void>;
  sendMessage(steamIds: string[], message): Promise<void>;
}

@provideSingleton(WEBSOCKET_PROVIDER_SYMBOL)
export class WebsocketProvider implements IWebsocketProvider {
  constructor(
    @inject(WEBSOCKET_CONNECTION_REPOSITORY_SYMBOL) private wsRepository: IWebsocketConnectionRepository,
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository
  ) {}

  async registerUser(steamId: string, connectionId: string) {
    const pud = (await this.pudRepository.get(steamId)) || ({ steamId } as PrivateUserData);
    pud.websocketConnectionIds = pud.websocketConnectionIds || [];
    pud.websocketConnectionIds.push(connectionId);

    await this.pudRepository.saveVersioned(pud);
    await this.wsRepository.saveVersioned({
      connectionId,
      steamId,
      establishedDate: new Date()
    });
  }

  async unregisterUser(connectionId: string) {
    const connection = await this.wsRepository.getByConnectionId(connectionId);

    if (connection) {
      const pud = await this.pudRepository.get(connection.steamId);

      if (pud) {
        pud.websocketConnectionIds = (pud.websocketConnectionIds || []).filter(x => x !== connectionId);
        await this.pudRepository.saveVersioned(pud);
      }

      await this.wsRepository.delete(connection);
    }
  }

  // eslint-disable-next-line
  async sendMessage(steamIds: string[], message: string) {
    // Disabling until better tested
    /*const api = new ApiGatewayManagementApi({
      endpoint: `${Config.activeStage === 'prod' ? 'ws' : 'ws-dev'}.playyourdamnturn.com`
    });

    const puds = await this.pudRepository.batchGet(steamIds);

    for (const pud of puds) {
      for (const connectionId of pud.websocketConnectionIds || []) {
        await api
          .postToConnection({
            ConnectionId: connectionId,
            Data: message
          })
          .promise();
      }
    }*/
  }
}
