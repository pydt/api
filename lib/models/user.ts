export interface HasSteamId {
  steamId: string;
}

export interface TurnData {
  firstTurnEndDate?: Date;
  lastTurnEndDate?: Date;
  turnsPlayed: number;
  turnsSkipped: number;
  timeTaken: number;
  fastTurns: number;
  slowTurns: number;
  hourOfDayQueue: string;
  dayOfWeekQueue: string;
  turnLengthBuckets: Record<number, number>;
  yearBuckets: Record<number, number>;
}

export interface GameTypeTurnData extends TurnData {
  gameType: string;
  activeGames: number;
  totalGames: number;
}

export interface User extends HasSteamId, TurnData {
  displayName: string;
  avatarSmall: string;
  avatarMedium: string;
  avatarFull: string;
  steamProfileUrl: string;
  vacationMode?: boolean;
  timezone?: string;
  comments?: string;
  activeGameIds: string[];
  inactiveGameIds: string[];
  statsByGameType: GameTypeTurnData[];
  forumUsername?: string;
  willSubstituteForGameTypes: string[];
  banned?: boolean;
  canCreateMultipleGames?: boolean;
  dataVersion?: number;
  // Average length in ms of the player's most recent finished turns (up to RECENT_TURN_COUNT, skipped
  // turns included), and how many turns it covers. Recomputed from the turn table whenever a turn ends.
  recentTurnAverage?: number;
  recentTurnCount?: number;
}

export interface DeprecatedUser extends User {
  emailAddress: string;
  webhookUrl?: string;
}
