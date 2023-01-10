import { injectable } from 'inversify';
import * as moment from 'moment';
import { Config } from '../../lib/config';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import {
  IPrivateUserDataRepository,
  PRIVATE_USER_DATA_REPOSITORY_SYMBOL
} from '../../lib/dynamoose/privateUserDataRepository';
import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../lib/email/sesProvider';
import { inject } from '../../lib/ioc';
import { loggingHandler } from '../../lib/logging';
import { Game } from '../../lib/models';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const nng = iocContainer.resolve(NotifyNewGames);
  await nng.execute();
});

@injectable()
export class NotifyNewGames {
  constructor(
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider
  ) {}

  public async execute() {
    const notificationPuds = await this.pudRepository.getAllWithNewGameNotificationData();
    const games = await this.gameRepository.unstartedGames(0);
    // Make sure this is set to the same cron period as the lambda function!
    const createdAtCutoff = moment().add(-1, 'hour').valueOf();

    for (const pud of notificationPuds) {
      const gamesToNotifyAbout: Game[] = [];

      for (const game of games) {
        if (game.createdAt.getTime() > createdAtCutoff) {
          if (!pud.newGameEmailTypes.includes(game.gameType)) {
            // Game type doesn't match, skip
            continue;
          }

          if (!pud.newGameEmailsWithPasswords && !!game.hashedPassword) {
            // Game has password and we don't want that
            continue;
          }

          const filters = (pud.newGameEmailFilter || '').trim().split(',');

          if (filters.length) {
            if (
              !filters.some(x =>
                game.displayName.toLocaleLowerCase().includes(x.trim().toLocaleLowerCase())
              )
            ) {
              // We have filters but no filters matched
              continue;
            }
          }

          gamesToNotifyAbout.push(game);
        }
      }

      if (gamesToNotifyAbout.length) {
        await this.ses.sendEmail(
          `${gamesToNotifyAbout.length} New Games on Play Your Damn Turn!`,
          'The following new games match your notification criteria:',
          `<ul>${gamesToNotifyAbout
            .map(x => `<li><a href="${Config.webUrl}/game/${x.gameId}">${x.displayName}</a></li>`)
            .join('\n')}</ul>`,
          pud.emailAddress
        );
      }
    }
  }
}
