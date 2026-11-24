import { BaseGame, Game, GameTurn } from '../../../lib/models';

export interface ChangeCivRequestBody {
  steamId?: string;
  playerCiv: string;
  playerCivilization?: string;
}

export interface LeaveRequestBody {
  steamId?: string;
}

export interface RequestSubstitutionBody {
  steamId?: string;
}

export interface SurrenderBody {
  kickUserId?: string;
}

export interface GameRequestBody extends BaseGame {
  password?: string;
}

export interface UpdateTurnOrderRequestBody {
  steamIds: string[];
}

export interface CanCreateGameRequestBody {
  gameType: string;
}

export interface CanCreateGameResponseBody {
  canCreate: boolean;
  message?: string;
}

export interface CreateGameRequestBody extends GameRequestBody {
  player1Civ: string;
  player1Civilization?: string;
}

export interface JoinGameRequestBody extends ChangeCivRequestBody {
  password?: string;
}

export interface ReplacePlayerRequestBody {
  oldSteamId: string;
  newSteamId: string;
}
export interface ReplaceRequestedSubstitutionPlayerRequestBody extends ReplacePlayerRequestBody {
  password?: string;
}

export interface OpenGamesResponse {
  notStarted: Game[];
  openSlots: Game[];
}

export interface GameTurnResponse {
  downloadUrl: string;
  version?: string;
  size?: number;
}

export interface StartTurnSubmitResponse {
  // Upload through S3 Transfer Acceleration
  putUrl: string;
  // Same upload through the regular S3 endpoint, to retry with if putUrl fails with a network error
  // or a 5xx (Acceleration has had 504 outages, forum #14499)
  fallbackPutUrl?: string;
}

export interface GameTurnListItem extends GameTurn {
  hasSave: boolean;
}

export interface OpenSlotsGame extends Game {
  joinAfterStart: boolean;
  substitutionRequested: boolean;
}
