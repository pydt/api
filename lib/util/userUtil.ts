import { User, Game } from '../models';

export class UserUtil {
  public static createS3GameCacheKey(steamId: string): string {
    return steamId + '/' + 'gameCache.json';
  }

  public static addUserToGame(user: User, game: Game) {
    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds.push(game.gameId);

    const gameStats = this.getUserGameStats(user, game.gameType);
    gameStats.activeGames++;
    gameStats.totalGames++;
  }

  public static removeUserFromGame(user: User, game: Game, addToInactiveGames: boolean) {
    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds = user.activeGameIds.filter(x => x !== game.gameId);

    if (addToInactiveGames) {
      user.inactiveGameIds = user.inactiveGameIds || [];
      user.inactiveGameIds.push(game.gameId);
    }

    const gameStats = this.getUserGameStats(user, game.gameType);
    gameStats.activeGames = user.activeGameIds.length;

    if (!addToInactiveGames) {
      gameStats.totalGames--;
    }
  }

  public static getUserGameStats(user: User, gameType: string) {
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
