import { IGameRepository, GAME_REPOSITORY_SYMBOL } from '../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { IUserService, USER_SERVICE_SYMBOL } from '../../lib/services/userService';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../lib/s3Provider';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../lib/snsProvider';
import { loggingHandler } from '../../lib/logging';
import { Config } from '../../lib/config';
import { User, Game } from '../../lib/models';
import { inject } from '../../lib/ioc';
import { injectable } from 'inversify';
import { SNS_MESSAGES } from '../../lib/models/sns';
import * as _ from 'lodash';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const uugc = iocContainer.resolve(UpdateUserGameCache);
  const snsRecord = event.Records[0].Sns;
  await uugc.execute(snsRecord.Subject, snsRecord.Message);
});

@injectable()
export class UpdateUserGameCache {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(USER_SERVICE_SYMBOL) private userService: IUserService,
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider
  ) {
  }
  
  public async execute(subject: string, gameId: string) {
    const game = await this.gameRepository.get(gameId);
  
    if (!game || !game.inProgress) {
      return;
    }
  
    const users = await this.userService.getUsersForGame(game);
  
    if (!users || !users.length) {
      return;
    }
  
    await this.updateUsers(users);
  
    await this.sns.userGameCacheUpdated({
      gameId: game.gameId,
      newTurn: subject === SNS_MESSAGES.TURN_SUBMITTED
    });
  }
  
  private async updateUsers(users: User[]): Promise<void> {
    const gameIds = _.compact(_.uniq(_.concat(_.flatMap(users, 'activeGameIds') as string[])));
    const games = await this.gameRepository.batchGet(gameIds);
    await Promise.all(_.map(users, user => {
      return this.updateUser(user, games);
    }));
  }
    
  private async updateUser(user: User, games: Game[]): Promise<void> {
    const result = _.filter(games, game => {
      return _.includes(user.activeGameIds, game.gameId);
    });
  
    await this.s3.putObject({
      Bucket: Config.resourcePrefix() + 'saves',
      Key: this.userService.createS3GameCacheKey(user.steamId)
    }, JSON.stringify(result), true);
  }
}
