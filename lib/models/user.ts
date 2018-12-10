export interface HasSteamId {
  steamId: string;
}

export interface User extends HasSteamId {
  displayName: string;
  avatarSmall: string;
  avatarMedium: string;
  avatarFull: string;
  emailAddress: string;
  vacationMode?: boolean;
  timezone?: string;
  comments?: string;
  activeGameIds: string[];
  inactiveGameIds: string[];
  turnsPlayed: number;
  turnsSkipped: number;
  timeTaken: number;
  fastTurns: number;
  slowTurns: number;
  turnsByGameType: { [gameType: string]: number; };
}
