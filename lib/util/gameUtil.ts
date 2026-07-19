import { PYDT_METADATA } from '../metadata/metadata';
import { Game, GamePlayer, GameTurn } from '../models';

export class GameUtil {
  public static getPlayerCivDisplayName(game: Game, player: GamePlayer) {
    const civGame = PYDT_METADATA.civGames.find(cg => cg.id === game.gameType);

    if (!civGame) {
      return player.civType;
    }

    const leaderDef = civGame.leaders.find(l => l.leaderKey === player.civType);

    if (!leaderDef) {
      return player.civType;
    }

    let civDisplayName: string;

    if (civGame.separateLeaderCiv) {
      if (player.civilization) {
        const civDef = civGame.civilizations.find(c => c.civKey === player.civilization);
        civDisplayName = civDef ? civDef.civDisplayName : player.civilization;
      }
    } else if (!leaderDef.options.justShowLeaderName) {
      civDisplayName = leaderDef.civDisplayName;
    }

    // Use a dash rather than leaderDef.fullDisplayName's parens, since the caller
    // typically wraps this in its own parens (e.g. "PlayerName (Leader - Civ)").
    return civDisplayName
      ? `${leaderDef.leaderDisplayName} - ${civDisplayName}`
      : leaderDef.leaderDisplayName;
  }

  public static padGameTurn(turn: number) {
    return ('' + turn).padStart(6, '0');
  }

  public static createS3SaveKey(gameId: string, turn: number) {
    return `${gameId}/${GameUtil.padGameTurn(turn)}.CivXSave`;
  }

  public static createS3ImageKey(gameId: string, round: number) {
    // overwrite with latest image for round
    return `${gameId}_images/${GameUtil.padGameTurn(round)}.png`;
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

  public static canDownloadTurn(game: Game, gameTurn: GameTurn, steamId: string) {
    return game.finalized || gameTurn.playerSteamId === steamId;
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

  public static possiblyUpdateAdmin(game: Game) {
    const firstHuman = game.players.find(GameUtil.playerIsHuman);

    if (firstHuman && firstHuman.steamId !== game.createdBySteamId) {
      // If game creator has been defeated, transfer admin to first available player
      game.createdBySteamId = firstHuman.steamId;
    }
  }
}
