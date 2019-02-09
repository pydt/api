import { compact, pull } from 'lodash';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../dynamoose/userRepository';
import { inject, provideSingleton } from '../ioc';
import { Game, GameTypeTurnData, User } from '../models';

export const USER_SERVICE_SYMBOL = Symbol('IUserService');

export interface IUserService {
  createS3GameCacheKey(steamId: string): string;
  getUsersForGame(game: Game): Promise<User[]>;
  addUserToGame(user: User, game: Game): void;
  removeUserFromGame(user: User, game: Game, addToInactiveGames: boolean): void;
  getUserGameStats(user: User, gameType: string): GameTypeTurnData;
}

@provideSingleton(USER_SERVICE_SYMBOL)
export class UserService implements IUserService {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository
  ) {
  }

  public createS3GameCacheKey(steamId: string): string {
    return steamId + '/' + 'gameCache.json';
  };

  public getUsersForGame(game: Game): Promise<User[]> {
    const steamIds = compact(game.players.map(x => x.steamId));
    return this.userRepository.batchGet(steamIds).then(users => {
      // make sure they're sorted correctly...
      const playersWithSteamIds = game.players.filter(player => {
        return !!player.steamId;
      });

      return playersWithSteamIds.map(player => {
        return users.find(user => {
          return user.steamId === player.steamId;
        });
      });
    });
  };

  public addUserToGame(user: User, game: Game) {
    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds.push(game.gameId);

    const gameStats = this.getUserGameStats(user, game.gameType);
    gameStats.activeGames++;
    gameStats.totalGames++;
  }

  public removeUserFromGame(user: User, game: Game, addToInactiveGames: boolean) {
    user.activeGameIds = user.activeGameIds || [];
    pull(user.activeGameIds, game.gameId);

    if (addToInactiveGames) {
      user.inactiveGameIds = user.inactiveGameIds || [];
      user.inactiveGameIds.push(game.gameId);
    }

    const gameStats = this.getUserGameStats(user, game.gameType);
    gameStats.activeGames--;

    if (!addToInactiveGames) {
      gameStats.totalGames--;
    }
  }

  public getUserGameStats(user: User, gameType: string) {
    user.statsByGameType = user.statsByGameType || [];
    let gameStats = user.statsByGameType.find(x => x.gameType === gameType);

    if (!gameStats) {
      gameStats = {
        gameType: gameType,
        activeGames: 0,
        totalGames: 0,
        fastTurns: 0,
        slowTurns: 0,
        timeTaken: 0,
        turnsPlayed: 0,
        turnsSkipped: 0
      };

      user.statsByGameType.push(gameStats);
    }

    return gameStats;
  }
}
