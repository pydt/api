import { User, Game } from '../../lib/models';
import { IGameRepository, GAME_REPOSITORY_SYMBOL } from '../../lib/dynamoose/gameRepository';
import { IGameTurnRepository, GAME_TURN_REPOSITORY_SYMBOL } from '../../lib/dynamoose/gameTurnRepository';
import { IGameTurnService, GAME_TURN_SERVICE_SYMBOL } from '../../lib/services/gameTurnService';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import * as _ from 'lodash';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const gameRepository = iocContainer.get<IGameRepository>(GAME_REPOSITORY_SYMBOL);
  const gameTurnRepository = iocContainer.get<IGameTurnRepository>(GAME_TURN_REPOSITORY_SYMBOL);
  const gameTurnService = iocContainer.get<IGameTurnService>(GAME_TURN_SERVICE_SYMBOL);
  const userRepository = iocContainer.get<IUserRepository>(USER_REPOSITORY_SYMBOL);

  async function calculateUserStats(users: User[]) {
    for (const user of users) {
      resetStatistics(user);
    
      const allGameIds = _.concat(user.activeGameIds || [], user.inactiveGameIds || []);
      
      pydtLogger.info(`Processing user ${user.displayName}`);
    
      if (!allGameIds.length) {
        continue;
      }
      
      const games = await gameRepository.batchGet(allGameIds);
      await calculateGameStats(games, user);
      await userRepository.saveVersioned(user);
    }
  }
  
  async function calculateGameStats(games: Game[], user: User) {
    for (const game of games) {
      const player = _.find(game.players, player => {
        return player.steamId === user.steamId;
      });
    
      resetStatistics(player);
    
      const turns = await gameTurnRepository.query('gameId').eq(game.gameId).filter('playerSteamId').eq(user.steamId).exec();
    
      for (const turn of turns) {
        gameTurnService.updateTurnStatistics(game, turn, user);
      }
    
      await gameRepository.saveVersioned(game);
    }
  }

  const userId = event.Records[0].Sns.Message;
  let users: User[];

  if (userId) {
    users = [await userRepository.get(userId)];
  } else {
    users = await userRepository.scan().exec();
  }
  
  await calculateUserStats(users);
});

function resetStatistics(host) {
  host.turnsPlayed = 0;
  host.turnsSkipped = 0;
  host.timeTaken = 0;
  host.fastTurns = 0;
  host.slowTurns = 0;
}
