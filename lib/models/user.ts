export interface HasSteamId {
  steamId: string;
}

export interface TurnData {
  turnsPlayed: number;
  turnsSkipped: number;
  timeTaken: number;
  fastTurns: number;
  slowTurns: number;
}

export interface GameTypeTurnData extends TurnData {
  gameType: string;
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
}
