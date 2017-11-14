import { gameRepository } from '../../lib/dynamoose/gameRepository';
import { scheduledJobRepository, JOB_TYPES } from '../../lib/dynamoose/scheduledJobRepository';
import { loggingHandler } from '../../lib/logging';

export const handler = loggingHandler(async (event, context) => {
  const gameId = event.Records[0].Sns.Message;
  const game = await gameRepository.get(gameId);

  if (!game || !game.inProgress || !game.turnTimerMinutes) {
    return null;
  }

  await scheduledJobRepository.saveVersioned({
    jobType: JOB_TYPES.TURN_TIMER,
    scheduledTime: new Date(new Date().getTime() + game.turnTimerMinutes * 60000),
    gameId: gameId
  });
});
