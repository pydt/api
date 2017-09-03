export interface User {
  steamId: string;
  displayName: string;
  avatarSmall: string;
  avatarMedium: string;
  avatarFull: string;
  emailAddress: string;
  activeGameIds: string[];
  inactiveGameIds: string[];
  turnsPlayed: number;
  turnsSkipped: number;
  timeTaken: number;
  fastTurns: number;
  slowTurns: number;
};
