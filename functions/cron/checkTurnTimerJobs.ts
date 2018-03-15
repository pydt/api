import { IGameRepository, GAME_REPOSITORY_SYMBOL } from '../../lib/dynamoose/gameRepository';
import { IGameTurnRepository, GAME_TURN_REPOSITORY_SYMBOL } from '../../lib/dynamoose/gameTurnRepository';
import { IScheduledJobRepository, SCHEDULED_JOB_REPOSITORY_SYMBOL, JOB_TYPES } from '../../lib/dynamoose/scheduledJobRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { IGameTurnService, GAME_TURN_SERVICE_SYMBOL } from '../../lib/services/gameTurnService';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../lib/s3Provider';
import { ScheduledJob } from '../../lib/models';
import { Config } from '../../lib/config';
import { loggingHandler } from '../../lib/logging';
import { sendEmail } from '../../lib/email/ses';
import { inject } from '../../lib/ioc';
import { injectable } from 'inversify';
import * as _ from 'lodash';
import * as civ6 from 'civ6-save-parser';

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
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService,
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider
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
      await this.skipTurn(game, turn);
    }
  }
  
  private async skipTurn(game, turn) {
    const currentPlayerSteamId = game.currentPlayerSteamId;
    turn.skipped = true;
  
    await this.gameTurnRepository.saveVersioned(turn);
    const data = await this.s3.getObject({
      Bucket: Config.resourcePrefix() + 'saves',
      Key: this.gameTurnService.createS3SaveKey(game.gameId, game.gameTurnRangeKey)
    });
  
    if (!data && !data.Body) {
      throw new Error('File doesn\'t exist?');
    }
  
    const civIndex = (game.gameTurnRangeKey - 1) % game.players.length;
    const wrapper = civ6.parse(data.Body);
    civ6.modifyChunk(wrapper.chunks, wrapper.parsed.CIVS[civIndex].ACTOR_AI_HUMAN, 1);
  
    await this.s3.putObject({
      Bucket: Config.resourcePrefix() + 'saves',
      Key: this.gameTurnService.createS3SaveKey(game.gameId, game.gameTurnRangeKey + 1)
    }, Buffer.concat(wrapper.chunks));
    
    const user = await this.userRepository.get(currentPlayerSteamId);
    await this.gameTurnService.moveToNextTurn(game, turn, user);
  
    await sendEmail(
      'You have been skipped in ' + game.displayName + '!',
      `You've been skipped!`,
      `The amount of time alloted for you to play your turn has expired.  Try harder next time!`,
      user.emailAddress
    );
  }
}
