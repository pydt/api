import { IGameRepository, GAME_REPOSITORY_SYMBOL } from '../../lib/dynamoose/gameRepository';
import { IScheduledJobRepository, SCHEDULED_JOB_REPOSITORY_SYMBOL, JOB_TYPES } from '../../lib/dynamoose/scheduledJobRepository';
import { loggingHandler } from '../../lib/logging';
import { inject } from '../../lib/ioc';
import { injectable } from 'inversify';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const attj = iocContainer.resolve(AddTurnTimerJob);
  await attj.execute(event.Records[0].Sns.Message);
});

@injectable()
export class AddTurnTimerJob {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(SCHEDULED_JOB_REPOSITORY_SYMBOL) private scheduledJobRepository: IScheduledJobRepository
  ) {
  }

  public async execute(gameId: string): Promise<void> {
    const game = await this.gameRepository.get(gameId);
  
    if (!game || !game.inProgress || !game.turnTimerMinutes) {
      return null;
    }
  
    await this.scheduledJobRepository.saveVersioned({
      jobType: JOB_TYPES.TURN_TIMER,
      scheduledTime: new Date(new Date().getTime() + game.turnTimerMinutes * 60000),
      gameId: gameId
    });
  }
}
