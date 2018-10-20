import { GamePlayer } from './gamePlayer';
import { Entity } from './shared';
import { SharedGame } from 'pydt-shared';
import * as _ from 'lodash';

export interface BaseGame extends SharedGame {
  displayName: string;
  description?: string;
  dlc: string[];
  slots: number;
  humans: number;
  randomOnly?: boolean;
  allowJoinAfterStart?: boolean;
}

export interface Game extends Entity, BaseGame {
  gameId: string;
  createdBySteamId: string;
  inProgress?: boolean;
  hashedPassword?: string;
  players: GamePlayer[];
  discourseTopicId?: number;
  currentPlayerSteamId: string;
  turnTimerMinutes?: number;
  round?: number;
  gameTurnRangeKey?: number;
  completed?: boolean;
  latestDiscoursePostNumber?: number;
  lastTurnEndDate?: Date;
}

export function getCurrentPlayerIndex(game: Game) {
  return _.indexOf(game.players, _.find(game.players, player => {
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
  return _.filter(game.players, player => {
    return player.steamId && (includeSurrendered || !player.hasSurrendered);
  });
};

export function playerIsHuman(player: GamePlayer) {
  return player.steamId && !player.hasSurrendered;
};
