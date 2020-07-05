import { injectable } from 'inversify';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { GAME_TURN_REPOSITORY_SYMBOL, IGameTurnRepository } from '../../lib/dynamoose/gameTurnRepository';
import { IPrivateUserDataRepository, PRIVATE_USER_DATA_REPOSITORY_SYMBOL } from '../../lib/dynamoose/privateUserDataRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject } from '../../lib/ioc';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import { DeprecatedUser, Game, PrivateUserData, User } from '../../lib/models';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../lib/services/gameTurnService';
import { UserUtil } from '../../lib/util/userUtil';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const rus = iocContainer.resolve(DataMigrations);
  await rus.execute(event.Records[0].Sns.Message);
});

@injectable()
export class DataMigrations {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService
  ) {}

  public async execute(message: string) {
    if (message === 'privateuserdata') {
      await this.createPrivateUserData();
    }

    if (message.startsWith('userstats')) {
      let users: User[];
      const userId = message.replace('userstats:', '');

      if (userId === 'all') {
        users = await this.userRepository.allUsers();
        users = users.filter(x => x.dataVersion < 2);
      } else if (userId) {
        users = [await this.userRepository.get(userId)];
      } else {
        throw new Error('userId or all must be provided');
      }

      await this.calculateUserStats(users);
    }
  }

  private async createPrivateUserData() {
    const users = (await this.userRepository.allUsers()).filter(x => !x.dataVersion || x.dataVersion < 3).map(x => x as DeprecatedUser);

    for (const user of users) {
      const pud: PrivateUserData = {
        emailAddress: user.emailAddress,
        steamId: user.steamId,
        webhookUrl: user.webhookUrl
      };

      user.dataVersion = 3;
      delete user.emailAddress;
      delete user.webhookUrl;

      await this.pudRepository.saveVersioned(pud);
      await this.userRepository.saveVersioned(user);
      console.log(`Created private user data for user ${user.displayName} (${user.steamId})`);
    }
  }

  private async calculateUserStats(users: User[]) {
    for (const user of users) {
      this.resetStatistics(user);

      const allGameIds = (user.activeGameIds || []).concat(user.inactiveGameIds || []);

      pydtLogger.info(`Processing user ${user.displayName}`);

      if (allGameIds.length) {
        const games = await this.gameRepository.batchGet(allGameIds);
        await this.calculateGameStats(games, user);
      }

      if (user.dataVersion < 2) {
        user.dataVersion = 2;
      }

      await this.userRepository.saveVersioned(user);
      console.log(`Recalculated stats for user ${user.displayName} (${user.steamId})`);
    }
  }

  private async calculateGameStats(games: Game[], user: User) {
    for (const game of games) {
      const player = game.players.find(player => {
        return player.steamId === user.steamId;
      });

      if (player) {
        this.resetStatistics(player);
      }

      const turns = await this.gameTurnRepository.getPlayerTurnsForGame(game.gameId, user.steamId);

      if (!turns || !turns.length) {
        continue;
      }

      const maxTurnDate = new Date(
        Math.max.apply(
          null,
          turns.map(x => x.endDate)
        )
      );

      if (!isNaN(maxTurnDate.getTime())) {
        if (!game.lastTurnEndDate || maxTurnDate > game.lastTurnEndDate) {
          game.lastTurnEndDate = maxTurnDate;
        }
      }

      for (const turn of turns) {
        this.gameTurnService.updateTurnStatistics(game, turn, user);
      }

      const stats = UserUtil.getUserGameStats(user, game.gameType);
      stats.activeGames += game.players.some(x => x.steamId === user.steamId && !x.hasSurrendered) ? 1 : 0;
      stats.totalGames++;

      // no need to update game at this time, should be OK
      //await this.gameRepository.saveVersioned(game);
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
