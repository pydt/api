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
import { Game, ScheduledJob } from '../../lib/models';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../lib/services/gameTurnService';
import { uniq, flatten, chunk } from 'lodash';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const cttj = iocContainer.resolve(CheckTurnTimerJobs);
  await cttj.execute();
});

@injectable()
export class CheckTurnTimerJobs {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(SCHEDULED_JOB_REPOSITORY_SYMBOL)
    private scheduledJobRepository: IScheduledJobRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository
  ) {}

  public async execute() {
    const jobs = await this.scheduledJobRepository.getWaitingJobs(JOB_TYPES.TURN_TIMER);

    if (jobs && jobs.length) {
      await this.processJobs(jobs, this.checkTurnTimer);
    }
  }

  private async processJobs(jobs: ScheduledJob[], callback: (game: Game) => Promise<void>) {
    const gameIds = uniq(flatten(jobs.map(x => x.gameIds)));
    const games = await this.gameRepository.batchGet(gameIds);

    for (const game of games) {
      try {
        await callback.call(this, game);
      } catch (err) {
        pydtLogger.error(`Error running job in game ${game.gameId}`, err);
      }
    }

    for (const curChunk of chunk(jobs, 10)) {
      pydtLogger.info(`Deleting ${curChunk.length} jobs...`);
      await this.scheduledJobRepository.batchDelete(curChunk);
    }
  }

  private async checkTurnTimer(game: Game) {
    if (game.turnTimerMinutes) {
      const turn = await this.gameTurnRepository.get({
        gameId: game.gameId,
        turn: game.gameTurnRangeKey
      });

      if (!turn) {
        throw new Error(
          `checkTurnTimer: Turn ${game.gameTurnRangeKey} for game ${game.gameId} not found`
        );
      }

      if (!turn.endDate) {
        let skipTurn =
          new Date().getTime() - turn.startDate.getTime() > game.turnTimerMinutes * 60000;
        let reason = 'normal timer';

        const user = await this.userRepository.get(game.currentPlayerSteamId);

        if (user?.vacationMode) {
          reason = `vacation: ${game.turnTimerVacationHandling}`;

          switch (game.turnTimerVacationHandling) {
            case 'PAUSE':
              skipTurn = false;
              pydtLogger.info(`Not skipping turn because of PAUSE mode in ${game.gameId}`);
              break;

            case 'SKIP_AFTER_TIMER':
              // Do nothing, skip if timer expires
              break;

            case 'SKIP_IMMEDIATELY':
              skipTurn = true;
              break;

            default:
              throw new Error(
                `Unrecognized turnTimerVacationHandling: ${game.turnTimerVacationHandling} in game ${game.gameId}`
              );
          }
        }

        if (skipTurn) {
          pydtLogger.info(`Skipping turn due to ${reason} in game ${game.gameId}`);
          await this.gameTurnService.skipTurn(game, turn);
        }
      }
    }
  }
}
