import { injectable } from 'inversify';
import * as _ from 'lodash';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { GAME_TURN_REPOSITORY_SYMBOL, IGameTurnRepository } from '../../lib/dynamoose/gameTurnRepository';
import { IScheduledJobRepository, JOB_TYPES, SCHEDULED_JOB_REPOSITORY_SYMBOL } from '../../lib/dynamoose/scheduledJobRepository';
import { inject } from '../../lib/ioc';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import { ScheduledJob } from '../../lib/models';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../lib/services/gameTurnService';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const cttj = iocContainer.resolve(CheckTurnTimerJobs);
  await cttj.execute();
});

@injectable()
export class CheckTurnTimerJobs {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(SCHEDULED_JOB_REPOSITORY_SYMBOL) private scheduledJobRepository: IScheduledJobRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService
  ) {
  }

  public async execute() {
    const jobs = await this.scheduledJobRepository.getWaitingJobs(JOB_TYPES.TURN_TIMER);

    if (jobs && jobs.length) {
      await this.processJobs(jobs);
    }
  }

  private async processJobs(jobs: ScheduledJob[]) {
    const gameIds = _.uniq(_.map(jobs, 'gameId'));
    const games = await this.gameRepository.batchGet(gameIds);
  
    await Promise.all(_.map(games, async game => {
      if (game.turnTimerMinutes) {
        await this.checkTurnTimer(game);
      }
    }));
    
    await this.scheduledJobRepository.batchDelete(jobs);
  }
  
  private async checkTurnTimer(game) {
    const turn = await this.gameTurnRepository.get({ gameId: game.gameId, turn: game.gameTurnRangeKey });
    
    if (!turn.endDate  && new Date().getTime() - turn.startDate.getTime() > game.turnTimerMinutes * 60000 ) {
      pydtLogger.info('Skipping turn in game ' + game.gameId);
      await this.gameTurnService.skipTurn(game, turn);
    }
  }
}
