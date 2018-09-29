export interface SaveHandler {
  civData: CivData[];

  gameTurn: number;
  parsedDlcs: string[];
  gameSpeed: string;
  mapFile: string;
  mapSize: string;

  getData(): Buffer;
}

export enum ActorType {
  HUMAN,
  AI
}

export interface CivData {
  type: ActorType;
  playerName: string;
  password: string;
  leaderName: string;
  isAlive: boolean;
  isCurrentTurn: boolean;
}
