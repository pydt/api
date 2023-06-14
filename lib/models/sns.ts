import { CIV6_GAME } from '../metadata/civGames/civ6';

export const SNS_MESSAGES = {
  GAME_UPDATED: 'game-updated',
  TURN_SUBMITTED: 'turn-submitted',
  USER_GAME_CACHE_UPDATED: 'user-game-cache-updated',
  GAME_FINALIZED: 'game-finalized'
};

export const GAME_STATE_IMAGE_MESSAGES = {
  [CIV6_GAME.id]: 'civ-6-game-state-image'
};

export interface UserGameCacheUpdatedPayload {
  gameId: string;
  newTurn: boolean;
}
