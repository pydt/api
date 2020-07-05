import { Game, GamePlayer } from '../models';

export class GameUtil {
  public static createS3SaveKey(gameId: string, turn: number) {
    return gameId + '/' + ('000000' + turn).slice(-6) + '.CivXSave';
  }

  public static calculateIsCompleted(game: Game) {
    return game.players.filter(p => this.playerIsHuman(p)).length < 2;
  }

  public static getCurrentPlayerIndex(game: Game) {
    return game.players.indexOf(
      game.players.find(player => {
        return player.steamId === game.currentPlayerSteamId;
      })
    );
  }

  public static getNextPlayerIndex(game: Game) {
    let playerIndex = this.getCurrentPlayerIndex(game);
    let looped = false;

    do {
      playerIndex++;

      if (playerIndex >= game.players.length) {
        if (!looped) {
          playerIndex = 0;
          looped = true;
        } else {
          return -1;
        }
      }
    } while (!this.playerIsHuman(game.players[playerIndex]));

    return playerIndex;
  }

  public static getPreviousPlayerIndex(game: Game) {
    let playerIndex = this.getCurrentPlayerIndex(game);
    let looped = false;

    do {
      playerIndex--;

      if (playerIndex < 0) {
        if (!looped) {
          playerIndex = game.players.length - 1;
          looped = true;
        } else {
          return -1;
        }
      }
    } while (!this.playerIsHuman(game.players[playerIndex]));

    return playerIndex;
  }

  public static getHumans(game: Game, includeSurrendered?: boolean) {
    return game.players.filter(player => {
      return player.steamId && (includeSurrendered || !player.hasSurrendered);
    });
  }

  public static playerIsHuman(player: GamePlayer) {
    return player.steamId && !player.hasSurrendered;
  }
}
