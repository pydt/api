import { injectable } from 'inversify';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import {
  GAME_TURN_REPOSITORY_SYMBOL,
  IGameTurnRepository
} from '../../lib/dynamoose/gameTurnRepository';
import {
  IScheduledJobRepository,
  JOB_TYPES,
  SCHEDULED_JOB_REPOSITORY_SYMBOL
} from '../../lib/dynamoose/scheduledJobRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject } from '../../lib/ioc';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import { ScheduledJobKey } from '../../lib/models';
import { PYDT_METADATA } from '../../lib/metadata/metadata';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const attj = iocContainer.resolve(AddTurnTimerJob);
  await attj.execute(event.Records[0].Sns.Message);
});

@injectable()
export class AddTurnTimerJob {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(SCHEDULED_JOB_REPOSITORY_SYMBOL)
    private scheduledJobRepository: IScheduledJobRepository,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository
  ) {}

  public async execute(gameId: string): Promise<void> {
    const game = await this.gameRepository.get(gameId, true);

    if (
      !game ||
      !game.inProgress ||
      !game.gameTurnRangeKey ||
      !PYDT_METADATA.civGames.find(x => x.id === game.gameType).turnTimerSupported
    ) {
      pydtLogger.info('Ignoring game ' + gameId);
      return;
    }

    const user = await this.userRepository.get(game.currentPlayerSteamId);
    let jobKey: ScheduledJobKey;

    pydtLogger.info('User vacation mode: ' + user.vacationMode);
    pydtLogger.info('turn timer minutes: ' + game.turnTimerMinutes);

    if (user.vacationMode) {
      pydtLogger.info('creating vacation timer');
      jobKey = {
        jobType: JOB_TYPES.TURN_TIMER_VACATION,
        scheduledTime: new Date().getTime()
      };
    } else if (game.turnTimerMinutes) {
      pydtLogger.info('creating turn timer');
      const latestTurn = await this.gameTurnRepository.get({ gameId, turn: game.gameTurnRangeKey });
      jobKey = {
        jobType: JOB_TYPES.TURN_TIMER,
        scheduledTime: new Date(
          latestTurn.startDate.getTime() + game.turnTimerMinutes * 60000
        ).getTime()
      };
    } else {
      pydtLogger.info('aborting...');
      return;
    }

    const job = await this.scheduledJobRepository.get(jobKey);

    if (!job) {
      await this.scheduledJobRepository.saveVersioned({
        ...jobKey,
        gameIds: [gameId]
      });
      pydtLogger.info('added job', jobKey);
    } else if (job.gameIds.indexOf(gameId) < 0) {
      job.gameIds.push(gameId);
      await this.scheduledJobRepository.saveVersioned(job);
      pydtLogger.info('updated job', jobKey);
    }
  }
}
