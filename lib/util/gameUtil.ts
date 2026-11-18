import { PYDT_METADATA } from '../metadata/metadata';
import { Game, GamePlayer, GameTurn } from '../models';

// Stands in for a game's real password hash for anyone but the game's admin. The web UI only
// checks whether hashedPassword is truthy ("this game has a password"), so a fixed placeholder
// keeps that working without handing out the bcrypt hash for offline guessing.
export const HASHED_PASSWORD_PLACEHOLDER = '********';

export class GameUtil {
  // Copy of the game that's safe to show the given viewer (a steamId, or undefined when anonymous).
  // The webhook URL lets anyone post to that Discord channel, so only players in the game see it
  // (they're the ones it notifies anyway). The real password hash is only for the game's admin
  // (the edit form round-trips it). See forum #9628.
  public static sanitizeForViewer<T extends Partial<Game>>(game: T, viewerSteamId?: string): T {
    if (viewerSteamId && viewerSteamId === game.createdBySteamId) {
      return game;
    }

    const inGame = !!viewerSteamId && (game.players || []).some(p => p.steamId === viewerSteamId);
    const { webhookUrl, ...rest } = game;
    const result = (inGame ? { ...rest, webhookUrl } : rest) as T;

    if (game.hashedPassword) {
      result.hashedPassword = HASHED_PASSWORD_PLACEHOLDER;
    }

    return result;
  }

  // A JSON.stringify replacer that sanitizes every game in a payload, however deeply nested
  // (single games, game lists, { data: Game[] } responses, ...). toJSON() has already run by the
  // time the replacer sees a value, so dynamoose items show up here as plain objects.
  public static jsonReplacerForViewer(viewerSteamId?: string) {
    return (_key: string, value: unknown) =>
      GameUtil.looksLikeGame(value) ? GameUtil.sanitizeForViewer(value, viewerSteamId) : value;
  }

  private static looksLikeGame(value: unknown): value is Game {
    return (
      !!value &&
      typeof value === 'object' &&
      typeof (value as Game).gameId === 'string' &&
      typeof (value as Game).createdBySteamId === 'string' &&
      Array.isArray((value as Game).players)
    );
  }

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
    const currentAdmin = game.players.find(player => player.steamId === game.createdBySteamId);

    if (currentAdmin && GameUtil.playerIsHuman(currentAdmin)) {
      // Admin is still alive, all good
      return;
    }

    const firstHuman = game.players.find(GameUtil.playerIsHuman);

    if (firstHuman && firstHuman.steamId !== game.createdBySteamId) {
      // If game creator has been defeated, transfer admin to first available player
      game.createdBySteamId = firstHuman.steamId;
    }
  }
}
