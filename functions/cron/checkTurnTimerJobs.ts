require('../../lib/banner');

import { injectable } from 'inversify';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { GAME_TURN_REPOSITORY_SYMBOL, IGameTurnRepository } from '../../lib/dynamoose/gameTurnRepository';
import { IScheduledJobRepository, JOB_TYPES, SCHEDULED_JOB_REPOSITORY_SYMBOL } from '../../lib/dynamoose/scheduledJobRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject } from '../../lib/ioc';
import { loggingHandler, pydtLogger } from '../../lib/logging';
import { Game, ScheduledJob } from '../../lib/models';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../lib/services/gameTurnService';
import { uniq, flatten } from 'lodash';

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
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository
  ) {
  }

  public async execute() {
    const jobs = await this.scheduledJobRepository.getWaitingJobs(JOB_TYPES.TURN_TIMER);

    if (jobs && jobs.length) {
      await this.processJobs(jobs, this.checkTurnTimer);
    }
    
    const vacationJobs = await this.scheduledJobRepository.getWaitingJobs(JOB_TYPES.TURN_TIMER_VACATION);

    if (vacationJobs && vacationJobs.length) {
      await this.processJobs(vacationJobs, this.checkVacation);
    }
  }

  private async processJobs(jobs: ScheduledJob[], callback: (game: Game) => Promise<void>) {
    const gameIds = uniq(flatten(jobs.map(x => x.gameIds)));
    const games = await this.gameRepository.batchGet(gameIds);
  
    await Promise.all(games.map(async game => {
      await callback.call(this, game);
    }));
    
    await this.scheduledJobRepository.batchDelete(jobs);
  }
  
  private async checkTurnTimer(game: Game) {
    if (game.turnTimerMinutes) {
      const turn = await this.gameTurnRepository.get({ gameId: game.gameId, turn: game.gameTurnRangeKey });
      
      if (!turn.endDate  && new Date().getTime() - turn.startDate.getTime() > game.turnTimerMinutes * 60000 ) {
        pydtLogger.info('Skipping turn due to timer in game ' + game.gameId);
        await this.gameTurnService.skipTurn(game, turn);
      }
    }
  }

  private async checkVacation(game: Game) {
    const user = await this.userRepository.get(game.currentPlayerSteamId);

    if (user.vacationMode) {
      const turn = await this.gameTurnRepository.get({ gameId: game.gameId, turn: game.gameTurnRangeKey });
      pydtLogger.info('Skipping turn due to vacation mode in game ' + game.gameId);
      await this.gameTurnService.skipTurn(game, turn);
    }
  }
}
