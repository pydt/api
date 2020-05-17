import { SharedGame } from 'pydt-shared-models';
import { GamePlayer } from './gamePlayer';
import { Entity } from './shared';

export interface BaseGame extends SharedGame {
  displayName: string;
  description?: string;
  webhookUrl?: string;
  dlc: string[];
  slots: number;
  humans: number;
  randomOnly?: boolean;
  allowJoinAfterStart?: boolean;
  turnTimerMinutes?: number;
}

export interface Game extends Entity, BaseGame {
  gameId: string;
  createdBySteamId: string;
  inProgress?: boolean;
  hashedPassword?: string;
  players: GamePlayer[];
  discourseTopicId?: number;
  currentPlayerSteamId: string;
  round?: number;
  gameTurnRangeKey?: number;
  completed?: boolean;
  latestDiscoursePostNumber?: number;
  latestDiscoursePostUser?: string;
  lastTurnEndDate?: Date;
}

export function getCurrentPlayerIndex(game: Game) {
  return game.players.indexOf(game.players.find(player => {
    return player.steamId === game.currentPlayerSteamId;
  }));
};

export function getNextPlayerIndex(game: Game) {
  let playerIndex = getCurrentPlayerIndex(game);
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
  } while (!playerIsHuman(game.players[playerIndex]));

  return playerIndex;
};

export function getPreviousPlayerIndex(game: Game) {
  let playerIndex = getCurrentPlayerIndex(game);
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
  } while (!playerIsHuman(game.players[playerIndex]));

  return playerIndex;
};

export function getHumans(game: Game, includeSurrendered?: boolean) {
  return game.players.filter(player => {
    return player.steamId && (includeSurrendered || !player.hasSurrendered);
  });
};

export function playerIsHuman(player: GamePlayer) {
  return player.steamId && !player.hasSurrendered;
};
