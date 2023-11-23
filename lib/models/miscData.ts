import { GameTypeTurnData, TurnData } from './user';

export interface MiscData<T> {
  key: string;
  data: T;
}

export interface GlobalStats
  extends MiscData<
    TurnData & {
      statsByGameType: GameTypeTurnData[];
    }
  > {}
