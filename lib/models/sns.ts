export const SNS_MESSAGES = {
  GAME_UPDATED: 'game-updated',
  TURN_SUBMITTED: 'turn-submitted',
  USER_GAME_CACHE_UPDATED: 'user-game-cache-updated'
};

export interface UserGameCacheUpdatedPayload {
  gameId: string;
  newTurn: boolean;
}
