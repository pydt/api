export interface HasSteamId {
  steamId: string;
}

export interface TurnData {
  lastTurnEndDate?: Date;
  turnsPlayed: number;
  turnsSkipped: number;
  timeTaken: number;
  fastTurns: number;
  slowTurns: number;
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
  emailAddress: string;
  vacationMode?: boolean;
  timezone?: string;
  comments?: string;
  activeGameIds: string[];
  inactiveGameIds: string[];
  statsByGameType: GameTypeTurnData[];
  webhookUrl?: string;
  willSubstituteForGameTypes: string[];
}
