import { injectable } from 'inversify';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { GAME_TURN_REPOSITORY_SYMBOL, IGameTurnRepository } from '../../lib/dynamoose/gameTurnRepository';
import { IScheduledJobRepository, JOB_TYPES, SCHEDULED_JOB_REPOSITORY_SYMBOL } from '../../lib/dynamoose/scheduledJobRepository';
import { inject } from '../../lib/ioc';
import { loggingHandler } from '../../lib/logging';
import { ScheduledJobKey } from '../../lib/models';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const attj = iocContainer.resolve(AddTurnTimerJob);
  await attj.execute(event.Records[0].Sns.Message);
});

@injectable()
export class AddTurnTimerJob {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(SCHEDULED_JOB_REPOSITORY_SYMBOL) private scheduledJobRepository: IScheduledJobRepository
  ) {
  }

  public async execute(gameId: string): Promise<void> {
    const game = await this.gameRepository.get(gameId);
  
    if (!game || !game.inProgress || !game.turnTimerMinutes || !game.gameTurnRangeKey) {
      return;
    }

    const latestTurn = await this.gameTurnRepository.get({gameId, turn: game.gameTurnRangeKey});
    const jobKey: ScheduledJobKey = {
      jobType: JOB_TYPES.TURN_TIMER, 
      scheduledTime: new Date(latestTurn.startDate.getTime() + game.turnTimerMinutes * 60000)
    };
    
    const job = await this.scheduledJobRepository.get(jobKey);

    if (!job) {
      await this.scheduledJobRepository.saveVersioned({
        ...jobKey,
        gameIds: [gameId]
      });
    } else if (job.gameIds.indexOf(gameId) < 0) {
      job.gameIds.push(gameId);
      await this.scheduledJobRepository.saveVersioned(job);
    }
  }
}
