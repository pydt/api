import { GamePlayer } from './gamePlayer';

export interface Game {
  gameId: string;
  createdBySteamId: string;
  dlc: string[];
  inProgress: boolean;
  completed: boolean;
  hashedPassword: string;
  displayName: string;
  allowJoinAfterStart: boolean;
  description: string;
  slots: number;
  humans: number;
  players: GamePlayer[];
  discourseTopicId: number;
  currentPlayerSteamId: string;
  turnTimerMinutes: number;
  round: number;
  gameTurnRangeKey: number;
  gameSpeed: string;
  mapFile: string;
  mapSize: string;
}
