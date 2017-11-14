export interface GameTurnKey {
  gameId: string;
  turn: number;
}

export interface GameTurn extends GameTurnKey {
  round: number;
  playerSteamId: string;
  startDate?: Date;
  endDate?: Date;
  skipped?: boolean;
}
