import { IGameRepository, GAME_REPOSITORY_SYMBOL } from '../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { IGameService, GAME_SERVICE_SYMBOL } from '../../lib/services/gameService';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import { Game } from '../../lib/models';
import { Config } from '../../lib/config';
import { sendEmail } from '../../lib/email/ses';
import * as moment from 'moment';
import * as _ from 'lodash';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const gameRepository = iocContainer.get<IGameRepository>(GAME_REPOSITORY_SYMBOL);
  const userRepository = iocContainer.get<IUserRepository>(USER_REPOSITORY_SYMBOL);
  const gameService = iocContainer.get<IGameService>(GAME_SERVICE_SYMBOL);

  async function deleteOldUnstartedGames() {
    const games: Game[] = await gameRepository
      .scan('inProgress').not().eq(true)
      .where('createdAt').lt(moment().add(-30, 'days').valueOf())
      .exec();
  
    await Promise.all(_.map(games, game => {
      pydtLogger.info(`deleted game ${game.gameId}`);
      return gameService.deleteGame(game, null);
    }));
  }
  
  async function notifyGamesAboutToBeDeleted() {
    const games: Game[] = await gameRepository
      .scan('inProgress').not().eq(true)
      .where('createdAt').lt(moment().add(-25, 'days').valueOf())
      .exec();
  
    await Promise.all(_.map(games, async game => {
      const expirationDate = moment(game.createdAt).add(30, 'days').format('MMMM Do');
      const user = await userRepository.get(game.createdBySteamId);
  
      if (user.emailAddress) {
        await sendEmail(
          `Game Scheduled for Deletion`,
          `Game Scheduled for Deletion`,
          `A game that you have created but not started (<b>${game.displayName}</b>) is scheduled to be deleted if you don't start it before <b>${expirationDate}</b>.  Please come start it before then!<br /><br />Game URL: ${Config.webUrl()}/game/${game.gameId}`,
          user.emailAddress
        );
      }
    }));
  }

  await deleteOldUnstartedGames();
  await notifyGamesAboutToBeDeleted();
});
