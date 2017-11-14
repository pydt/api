export interface GamePlayer {
  steamId: string;
  civType: string;
  hasSurrendered?: boolean;
  turnsPlayed?: number;
  turnsSkipped?: number;
  timeTaken?: number;
  fastTurns?: number;
  slowTurns?: number;
}
