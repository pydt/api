import { TurnData } from './user';

export interface GamePlayer extends Partial<TurnData> {
  steamId: string;
  civType: string;
  hasSurrendered?: boolean;
  surrenderDate?: Date;
}
