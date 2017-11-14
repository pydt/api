import { gameRepository } from '../../lib/dynamoose/gameRepository';
import { userRepository } from '../../lib/dynamoose/userRepository';
import { deleteGame } from '../../lib/services/gameService';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import { Game } from '../../lib/models';
import { Config } from '../../lib/config';
import * as moment from 'moment';
import * as _ from 'lodash';
import * as AWS from 'aws-sdk';
const ses = new AWS.SES();

export const handler = loggingHandler(async (event, context) => {
  await deleteOldUnstartedGames();
  await notifyGamesAboutToBeDeleted();
});

async function deleteOldUnstartedGames() {
  const games: Game[] = await gameRepository
    .scan('inProgress').not().eq(true)
    .where('createdAt').lt(moment().add(-30, 'days').valueOf())
    .exec();

  await Promise.all(_.map(games, game => {
    pydtLogger.info(`deleted game ${game.gameId}`);
    return deleteGame(game, null);
  }));
}

async function notifyGamesAboutToBeDeleted() {
  const games: Game[] = await gameRepository
    .scan('inProgress').not().eq(true)
    .where('createdAt').lt(moment().add(-25, 'days').valueOf())
    .exec();

  await Promise.all(_.map(games, async game => {
    const expirationDate = moment(game.createdAt).add(30, 'days').format('MMMM Do');
    const user = await userRepository.get(game.createdBySteamId)    
    const email = {
      Destination: {
        ToAddresses: [
          user.emailAddress
        ]
      },
      Message: {
        Body: {
          Html: {
            Data: `<p>A game that you have created but not started (<b>${game.displayName}</b>) is scheduled to be deleted if you don't start it before <b>${expirationDate}</b>.  Please come start it before then!</p><p>Game URL: ${Config.webUrl()}/game/${game.gameId}</p>`
          }
        }, Subject: {
          Data: `Game Scheduled for Deletion`
        }
      },
      Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
    };

    await ses.sendEmail(email).promise();
  }));
}