import { inject, injectable } from 'inversify';
import { JwtUtil } from '../lib/auth/jwtUtil';
import { loggingHandler, pydtLogger } from '../lib/logging';
import { IWebsocketProvider, WEBSOCKET_PROVIDER_SYMBOL } from '../lib/websocketProvider';
import { LambdaProxyEvent } from './framework';
import { validateNonce } from '../lib/auth/expressAuthentication';

export const handler = loggingHandler(async (event: LambdaProxyEvent, context, iocContainer) => {
  const doug = iocContainer.resolve(WebsocketHandler);
  return await doug.execute(
    event.requestContext.connectionId,
    event.requestContext.routeKey,
    event.body
  );
});

@injectable()
export class WebsocketHandler {
  constructor(@inject(WEBSOCKET_PROVIDER_SYMBOL) private wsProvider: IWebsocketProvider) {}

  public async execute(connectionId: string, routeKey: string, body: string) {
    pydtLogger.info(`handling websocket event: ${routeKey}`);

    switch (routeKey) {
      case '$connect':
        // Nothing to do here, just respond OK
        break;

      case 'auth':
        // validate token and tie user to connection
        const data = JwtUtil.parseToken(body);

        await validateNonce(data);

        await this.wsProvider.registerUser(data.steamId, connectionId);
        break;

      case '$disconnect':
        // Delete record for connection
        await this.wsProvider.unregisterUser(connectionId);
        break;
    }

    return { statusCode: 200 };
  }
}
