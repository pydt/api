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

const dataVersion = 1;

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

    if (userId === 'all') {
      users = await this.userRepository.allUsers();
      users = users.filter(x => (<any>x).dataVersion !== dataVersion);
    } else if (userId) {
      users = [await this.userRepository.get(userId)];
    } else {
      throw new Error('userId or all must be provided');
    }
    
    await this.calculateUserStats(users);
  }

  private async calculateUserStats(users: User[]) {
    for (const user of users) {
      this.resetStatistics(user);

      const allGameIds = _.concat(user.activeGameIds || [], user.inactiveGameIds || []);

      pydtLogger.info(`Processing user ${user.displayName}`);

      if (allGameIds.length) {
        const games = await this.gameRepository.batchGet(allGameIds);
        await this.calculateGameStats(games, user);
      }

      (<any>user).dataVersion = dataVersion;
      await this.userRepository.saveVersioned(user);
      console.log(`Recalculated stats for user ${user.displayName} (${user.steamId})`);
    }
  }
    
  private async calculateGameStats(games: Game[], user: User) {
    for (const game of games) {
      const player = _.find(game.players, player => {
        return player.steamId === user.steamId;
      });

      if (player) {
        this.resetStatistics(player); 
      }

      const turns = await this.gameTurnRepository.getPlayerTurnsForGame(game.gameId, user.steamId);

      if (!turns || !turns.length) {
        continue;
      }

      const maxTurnDate = new Date(Math.max.apply(null, turns.map(x => x.endDate)));

      if (!isNaN(maxTurnDate.getTime())) {
        if (!game.lastTurnEndDate || maxTurnDate > game.lastTurnEndDate) {
          game.lastTurnEndDate = maxTurnDate;
        }
      }

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

    if (host.statsByGameType) {
      host.statsByGameType = [];
    }
  }
}
