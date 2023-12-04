import { User, Game } from '../models';
import { StatsUtil } from './statsUtil';

export class UserUtil {
  public static createS3GameCacheKey(steamId: string): string {
    return steamId + '/' + 'gameCache.json';
  }

  public static addUserToGame(user: User, game: Game) {
    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds = [...new Set([...user.activeGameIds, game.gameId])];

    const gameStats = StatsUtil.getGameStats(user, game.gameType);
    gameStats.activeGames++;
    gameStats.totalGames++;
  }

  public static removeUserFromGame(user: User, game: Game, addToInactiveGames: boolean) {
    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds = [...new Set(user.activeGameIds.filter(x => x !== game.gameId))];

    if (addToInactiveGames) {
      user.inactiveGameIds = user.inactiveGameIds || [];
      user.inactiveGameIds = [...new Set([...user.inactiveGameIds, game.gameId])];
    }

    const gameStats = StatsUtil.getGameStats(user, game.gameType);
    gameStats.activeGames = user.activeGameIds.length;

    if (!addToInactiveGames) {
      gameStats.totalGames--;
    }
  }
}
