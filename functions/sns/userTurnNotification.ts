import { injectable } from 'inversify';
import { Config } from '../../lib/config';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../lib/email/sesProvider';
import { HTTP_REQUEST_PROVIDER_SYMBOL, IHttpRequestProvider } from '../../lib/httpRequestProvider';
import { inject } from '../../lib/ioc';
import { IIotProvider, IOT_PROVIDER_SYMBOL } from '../../lib/iotProvider';
import { loggingHandler } from '../../lib/logging';
import { UserGameCacheUpdatedPayload } from '../../lib/models/sns';
import { pydtLogger } from '../../lib/logging';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const utn = iocContainer.resolve(UserTurnNotification);
  await utn.execute(JSON.parse(event.Records[0].Sns.Message));
});

@injectable()
export class UserTurnNotification {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(IOT_PROVIDER_SYMBOL) private iot: IIotProvider,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider,
    @inject(HTTP_REQUEST_PROVIDER_SYMBOL) private http: IHttpRequestProvider
  ) {
  }

  public async execute(payload: UserGameCacheUpdatedPayload) {
    const game = await this.gameRepository.get(payload.gameId);

    if (!game || !game.inProgress || game.completed) {
      return;
    }

    const user = await this.userRepository.get(game.currentPlayerSteamId);

    if (payload.newTurn) {
      const webhooks = [game.webhookUrl, user.webhookUrl].filter(Boolean);

      for (const webhook of webhooks) {
        try
        {
          await this.http.request({
            method: 'POST',
            uri: webhook,
            body: {
              gameName: game.displayName,
              userName: user.displayName,
              round: game.round,
              // Duplicate "play by cloud" format
              value1: game.displayName,
              value2: user.displayName,
              value3: game.round
            },
            json: true,
            timeout: 2000
          });
        }
        catch (e) {
          pydtLogger.error('Error sending webhook to ' + webhook, e);
        }
      }

      await this.iot.notifyUserClient(user);

      if (user.emailAddress && !user.vacationMode) {
        await this.ses.sendEmail(
          `PLAY YOUR DAMN TURN in ${game.displayName} (Round ${game.round})`,
          'PLAY YOUR DAMN TURN!',
          `It's your turn in ${game.displayName}.  You should be able to play your turn in the client, or go here to download the save file: ${Config.webUrl()}/game/${game.gameId}`,
          user.emailAddress
        );
      }
    } else {
      // Notify all users in game...
      for (const player of game.players) {
        if (player.steamId && !player.hasSurrendered) {
          await this.iot.notifyUserClient(player);
        }
      }
    }
  }
}
