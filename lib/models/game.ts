import { GamePlayer } from './gamePlayer';
import { Entity } from './shared';

export interface BaseGame {
  gameSpeed?: string;
  mapFile?: string;
  mapSize?: string;
  gameType: string;
  displayName: string;
  description?: string;
  webhookUrl?: string;
  dlc: string[];
  slots: number;
  humans: number;
  allowDuplicateLeaders?: boolean;
  randomOnly?: 'EITHER' | 'FORCE_RANDOM' | 'FORCE_LEADER';
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
  clonedFromGameId?: string;
  currentPlayerSteamId: string;
  round?: number;
  gameTurnRangeKey?: number;
  completed?: boolean;
  latestDiscoursePostNumber?: number;
  latestDiscoursePostUser?: string;
  lastTurnEndDate?: Date;
  resetGameStateOnNextUpload?: boolean;
}
