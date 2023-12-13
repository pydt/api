import { GamePlayer } from './gamePlayer';
import { Entity } from './shared';
import { TurnData } from './user';

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
  turnTimerVacationHandling?: 'PAUSE' | 'SKIP_AFTER_TIMER' | 'SKIP_IMMEDIATELY';
}

export type GAME_FLAG = 'CIV6_CONGRESS_TURN';

export interface Game extends Entity, BaseGame, Partial<TurnData> {
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
  finalized?: boolean;
  gameVideoUrl?: string;
  dataVersion?: number;
  flags?: GAME_FLAG[];
}
