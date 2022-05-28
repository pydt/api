import { provideSingleton } from './ioc';
import { Game, WebPushSubscription } from './models';
import * as webpush from 'web-push';
import { Config } from './config';

export const WEB_PUSH_PROVIDER_SYMBOL = Symbol('IWebPushProvider');

export interface IWebPushProvider {
  sendNotification(wps: WebPushSubscription, game: Game): Promise<void>;
}

@provideSingleton(WEB_PUSH_PROVIDER_SYMBOL)
export class WebPushProvider implements IWebPushProvider {
  async sendNotification(wps: WebPushSubscription, game: Game): Promise<void> {
    await webpush.sendNotification(
      wps,
      JSON.stringify({
        notification: {
          actions: [
            {
              action: 'viewgame',
              title: 'View Game'
            }
          ],
          body: `It's your turn in ${game.displayName} (Round ${game.round})`,
          data: {
            gameId: game.gameId
          },
          icon: 'img/pydt_large.png',
          renotify: true,
          tag: 'pydt',
          title: 'Play Your Damn Turn',
          vibrate: [50, 50, 50, 50]
        }
      }),
      {
        vapidDetails: {
          subject: 'mailto:mike@playyourdamnturn.com',
          publicKey:
            'BJh1i7oz44uFwBjtIIN5B7AIyMlHvDt9LN8DbTl4xhgBIF2RrbLMF3B3ntlCK_3TaAL_AI0vK81E-pMCUWv8DO0',
          privateKey: Config.vapidPrivateKey
        }
      }
    );
  }
}
