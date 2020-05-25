require('../../lib/banner');

import { injectable } from 'inversify';
import { Config } from '../../lib/config';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { inject } from '../../lib/ioc';
import { loggingHandler } from '../../lib/logging';
import { Game, User } from '../../lib/models';
import { SNS_MESSAGES } from '../../lib/models/sns';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../lib/s3Provider';
import { IUserService, USER_SERVICE_SYMBOL } from '../../lib/services/userService';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../lib/snsProvider';
import { flatMap, concat, uniq, compact, includes } from 'lodash';

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
    const game = await this.gameRepository.get(gameId, true);
  
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
    const gameIds = compact(uniq(concat(flatMap(users, 'activeGameIds') as string[])));
    const games = await this.gameRepository.batchGet(gameIds, true);
    await Promise.all(users.map(user => {
      return this.updateUser(user, games);
    }));
  }
    
  private async updateUser(user: User, games: Game[]): Promise<void> {
    const result = games.filter(game => {
      return includes(user.activeGameIds, game.gameId);
    });
  
    await this.s3.putObject({
      Bucket: Config.resourcePrefix + 'saves',
      Key: this.userService.createS3GameCacheKey(user.steamId)
    }, JSON.stringify(result), true);
  }
}
