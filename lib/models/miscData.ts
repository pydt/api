import { GameTypeTurnData, TurnData } from './user';

export interface MiscData<T> {
  key: string;
  data: T;
}

export interface GlobalStats extends MiscData<GlobalStatsData> {}

export interface GlobalStatsData extends TurnData {
  statsByGameType: GameTypeTurnData[];
}
