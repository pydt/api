import { User, Game } from '../../lib/models';
import { gameRepository } from '../../lib/dynamoose/gameRepository';
import { gameTurnRepository } from '../../lib/dynamoose/gameTurnRepository';
import { userRepository } from '../../lib/dynamoose/userRepository';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import * as _ from 'lodash';

export const handler = loggingHandler(async (event, context) => {
  const userId = event.Records[0].Sns.Message;
  let users: User[];

  if (userId) {
    users = [await userRepository.get(userId)];
  } else {
    users = await userRepository.scan().exec();
  }
  
  await calculateUserStats(users);
});

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
      gameTurnRepository.updateTurnStatistics(game, turn, user);
    }
  
    await gameRepository.saveVersioned(game);
  }
}

function resetStatistics(host) {
  host.turnsPlayed = 0;
  host.turnsSkipped = 0;
  host.timeTaken = 0;
  host.fastTurns = 0;
  host.slowTurns = 0;
}
