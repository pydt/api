import { injectable } from 'inversify';
import * as _ from 'lodash';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { GAME_TURN_REPOSITORY_SYMBOL, IGameTurnRepository } from '../../lib/dynamoose/gameTurnRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject } from '../../lib/ioc';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import { Game, User } from '../../lib/models';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../lib/services/gameTurnService';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const rus = iocContainer.resolve(RecalculateUserStats);
  await rus.execute(event.Records[0].Sns.Message);
});

@injectable()
export class RecalculateUserStats {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService
  ) {
  }

  public async execute(userId: string) {
    let users: User[];

    if (userId) {
      users = [await this.userRepository.get(userId)];
    } else {
      users = await this.userRepository.allUsers();
    }
    
    await this.calculateUserStats(users);
  }

  private async calculateUserStats(users: User[]) {
    for (const user of users) {
      this.resetStatistics(user);
    
      const allGameIds = _.concat(user.activeGameIds || [], user.inactiveGameIds || []);
      
      pydtLogger.info(`Processing user ${user.displayName}`);
    
      if (!allGameIds.length) {
        continue;
      }
      
      const games = await this.gameRepository.batchGet(allGameIds);
      await this.calculateGameStats(games, user);
      await this.userRepository.saveVersioned(user);
    }
  }
    
  private async calculateGameStats(games: Game[], user: User) {
    for (const game of games) {
      const player = _.find(game.players, player => {
        return player.steamId === user.steamId;
      });
    
      this.resetStatistics(player);
    
      const turns = await this.gameTurnRepository.getPlayerTurnsForGame(game.gameId, user.steamId);
    
      for (const turn of turns) {
        this.gameTurnService.updateTurnStatistics(game, turn, user);
      }
    
      await this.gameRepository.saveVersioned(game);
    }
  }
  
  private resetStatistics(host) {
    host.turnsPlayed = 0;
    host.turnsSkipped = 0;
    host.timeTaken = 0;
    host.fastTurns = 0;
    host.slowTurns = 0;
  }
}
