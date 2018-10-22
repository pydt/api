export interface GamePlayer {
  steamId: string;
  civType: string;
  hasSurrendered?: boolean;
  surrenderDate?: Date;
  turnsPlayed?: number;
  turnsSkipped?: number;
  timeTaken?: number;
  fastTurns?: number;
  slowTurns?: number;
}
