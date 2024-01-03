import { injectable } from 'inversify';
import * as isUrl from 'is-url';
import { Config } from '../../lib/config';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import {
  IPrivateUserDataRepository,
  PRIVATE_USER_DATA_REPOSITORY_SYMBOL
} from '../../lib/dynamoose/privateUserDataRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../lib/email/sesProvider';
import { HTTP_REQUEST_PROVIDER_SYMBOL, IHttpRequestProvider } from '../../lib/httpRequestProvider';
import { inject } from '../../lib/ioc';
import { IIotProvider, IOT_PROVIDER_SYMBOL } from '../../lib/iotProvider';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import { UserGameCacheUpdatedPayload } from '../../lib/models/sns';
import { IWebsocketProvider, WEBSOCKET_PROVIDER_SYMBOL } from '../../lib/websocketProvider';
import { PYDT_METADATA } from '../../lib/metadata/metadata';
import { IWebPushProvider, WEB_PUSH_PROVIDER_SYMBOL } from '../../lib/webPushProvider';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const utn = iocContainer.resolve(UserTurnNotification);
  await utn.execute(JSON.parse(event.Records[0].Sns.Message));
});

@injectable()
export class UserTurnNotification {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository,
    @inject(IOT_PROVIDER_SYMBOL) private iot: IIotProvider,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider,
    @inject(HTTP_REQUEST_PROVIDER_SYMBOL) private http: IHttpRequestProvider,
    @inject(WEBSOCKET_PROVIDER_SYMBOL) private ws: IWebsocketProvider,
    @inject(WEB_PUSH_PROVIDER_SYMBOL) private wp: IWebPushProvider
  ) {}

  public async execute(payload: UserGameCacheUpdatedPayload) {
    const game = await this.gameRepository.get(payload.gameId, true);

    if (!game || !game.inProgress || game.completed) {
      return;
    }

    const user = await this.userRepository.get(game.currentPlayerSteamId);
    const pud = await this.pudRepository.get(game.currentPlayerSteamId);
    let updatePud = false;

    if (payload.newTurn) {
      if (!user.vacationMode) {
        const webhooks = [game.webhookUrl, pud.webhookUrl].filter(Boolean);

        for (const webhook of webhooks) {
          if (isUrl(webhook)) {
            try {
              const currentPlayer = game.players.find(x => x.steamId === game.currentPlayerSteamId);
              const gameData = PYDT_METADATA.civGames.find(x => x.id === game.gameType);
              const leader = gameData.leaders.find(x => x.leaderKey === currentPlayer.civType);

              await this.http.fetch(
                webhook,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  // will need to fix this if we move to standard fetch...
                  // https://stackoverflow.com/questions/54204342/node-fetch-why-is-signal-recommended-over-timeout
                  timeout: 5000,
                  body: JSON.stringify({
                    gameName: game.displayName,
                    userName: user.displayName,
                    round: game.round,
                    civName: leader ? leader.civDisplayName : null,
                    leaderName: leader ? leader.leaderDisplayName : null,
                    // Duplicate "play by cloud" format
                    value1: game.displayName,
                    value2: user.displayName,
                    value3: game.round,
                    // Discourse webhook "content" field
                    content: `It's ${user.displayName}'s turn in ${game.displayName} (Round ${game.round})`
                  })
                },
                true
              );
            } catch (e) {
              pydtLogger.info('Error sending webhook to ' + webhook, e);
            }
          }
        }

        for (const wps of [...(pud.webPushSubscriptions || [])]) {
          try {
            await this.wp.sendNotification(wps, game);
          } catch (err) {
            pydtLogger.error('webpush failed', err);
            pud.webPushSubscriptions = pud.webPushSubscriptions.filter(x => x !== wps);
            updatePud = true;
          }
        }

        if (pud.emailAddress && pud.newTurnEmails) {
          await this.ses.sendEmail(
            `PLAY YOUR DAMN TURN in ${game.displayName} (Round ${game.round})`,
            'PLAY YOUR DAMN TURN!',
            `It's your turn in ${game.displayName}.  You should be able to play your turn in the client, or go here to download the save file: ${Config.webUrl}/game/${game.gameId}.<br /><br />
            <strong><a href="https://discourse.playyourdamnturn.com/t/how-to-play-your-damn-turn/8723">If you need help playing your turn, click here!</a></strong>`,
            pud.emailAddress
          );
        }

        await this.ws.sendMessage([user.steamId], 'newturn');
        await this.iot.notifyUserClient(user);

        if (updatePud) {
          this.pudRepository.saveVersioned(pud);
        }
      }
    } else {
      // Notify all users in game...
      for (const player of game.players) {
        if (player.steamId && !player.hasSurrendered) {
          await this.iot.notifyUserClient(player);
        }
      }

      await this.ws.sendMessage(
        game.players.filter(x => x.steamId && !x.hasSurrendered).map(x => x.steamId),
        'newmessage'
      );
    }
  }
}
