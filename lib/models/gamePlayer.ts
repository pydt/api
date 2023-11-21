import { TurnData } from './user';

export interface GamePlayer extends TurnData {
  steamId: string;
  civType: string;
  hasSurrendered?: boolean;
  surrenderDate?: Date;
}
