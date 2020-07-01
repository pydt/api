import { injectable } from 'inversify';
import * as moment from 'moment';
import { Config } from '../../lib/config';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../lib/email/sesProvider';
import { inject } from '../../lib/ioc';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import { GAME_SERVICE_SYMBOL, IGameService } from '../../lib/services/gameService';
import { PRIVATE_USER_DATA_REPOSITORY_SYMBOL, IPrivateUserDataRepository } from '../../lib/dynamoose/privateUserDataRepository';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const doug = iocContainer.resolve(DeleteOldUnstartedGames);
  await doug.execute();
});

@injectable()
export class DeleteOldUnstartedGames {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository,
    @inject(GAME_SERVICE_SYMBOL) private gameService: IGameService,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider
  ) {}

  public async execute() {
    await this.deleteOldUnstartedGames();
    await this.notifyGamesAboutToBeDeleted();
  }

  private async deleteOldUnstartedGames(): Promise<void> {
    const games = await this.gameRepository.unstartedGames(30);

    await Promise.all(
      games.map(game => {
        pydtLogger.info(`deleted game ${game.gameId}`);
        return this.gameService.deleteGame(game, null);
      })
    );
  }

  private async notifyGamesAboutToBeDeleted(): Promise<void> {
    const games = await this.gameRepository.unstartedGames(25);

    await Promise.all(
      games.map(async game => {
        const expirationDate = moment(game.createdAt).add(30, 'days').format('MMMM Do');
        const pud = await this.pudRepository.get(game.createdBySteamId);

        if (pud.emailAddress) {
          await this.ses.sendEmail(
            `Game Scheduled for Deletion`,
            `Game Scheduled for Deletion`,
            `A game that you have created but not started (<b>${game.displayName}</b>) is scheduled to be deleted if you don't start it before <b>${expirationDate}</b>.  Please come start it before then!<br /><br />Game URL: ${Config.webUrl}/game/${game.gameId}`,
            pud.emailAddress
          );
        }
      })
    );
  }
}
