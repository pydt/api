import { IGameRepository, GAME_REPOSITORY_SYMBOL } from '../../lib/dynamoose/gameRepository';
import { IScheduledJobRepository, SCHEDULED_JOB_REPOSITORY_SYMBOL, JOB_TYPES } from '../../lib/dynamoose/scheduledJobRepository';
import { loggingHandler } from '../../lib/logging';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const gameRepository = iocContainer.get<IGameRepository>(GAME_REPOSITORY_SYMBOL);
  const scheduledJobRepository = iocContainer.get<IScheduledJobRepository>(SCHEDULED_JOB_REPOSITORY_SYMBOL);

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
