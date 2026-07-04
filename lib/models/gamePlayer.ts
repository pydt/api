import { TurnData } from './user';

export interface GamePlayer extends Partial<TurnData> {
  steamId: string;
  civType: string;
  // Civilization key for games with separateLeaderCiv (Civ 7). civType holds the leader key;
  // civilization holds the separately-chosen civilization. Only enforced against the initial save;
  // Civ 7 civilizations change at era boundaries so we don't track after turn 1.
  civilization?: string;
  hasSurrendered?: boolean;
  surrenderDate?: Date;
  substitutionRequested?: boolean;
  isDead?: boolean;
}
