import { GameTypeTurnData, TurnData } from './user';

export interface MiscData<T> {
  key: string;
  data: T;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GlobalStats extends MiscData<GlobalStatsData> {}

export interface GlobalStatsData extends TurnData {
  statsByGameType: GameTypeTurnData[];
}
