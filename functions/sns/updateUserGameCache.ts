import { injectable } from 'inversify';
import { compact, concat, flatMap, uniq } from 'lodash';
import { Config } from '../../lib/config';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject } from '../../lib/ioc';
import { loggingHandler } from '../../lib/logging';
import { Game, User } from '../../lib/models';
import { SNS_MESSAGES } from '../../lib/models/sns';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../lib/s3Provider';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../lib/snsProvider';
import { UserUtil } from '../../lib/util/userUtil';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const uugc = iocContainer.resolve(UpdateUserGameCache);
  const snsRecord = event.Records[0].Sns;
  await uugc.execute(snsRecord.Subject, snsRecord.Message);
});

@injectable()
export class UpdateUserGameCache {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider
  ) {}

  public async execute(subject: string, gameId: string) {
    const game = await this.gameRepository.get(gameId, true);

    if (!game || !game.inProgress) {
      return;
    }

    const users = await this.userRepository.getUsersForGame(game);

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
    await Promise.all(
      users.map(user => {
        return this.updateUser(user, games);
      })
    );
  }

  private async updateUser(user: User, games: Game[]): Promise<void> {
    const result: Game[] = [];
    let updateUser = false;

    for (const game of games) {
      if (game.players.some(x => x.steamId === user.steamId && !x.hasSurrendered)) {
        // Player in game
        result.push(game);
      } else {
        // Player not in game, validate active game list
        if ((user.activeGameIds || []).includes(game.gameId)) {
          UserUtil.removeUserFromGame(user, game, true);
          updateUser = true;
        }
      }
    }

    if (updateUser) {
      await this.userRepository.saveVersioned(user);
    }

    await this.s3.putObject(
      {
        Bucket: Config.resourcePrefix + 'saves',
        Key: UserUtil.createS3GameCacheKey(user.steamId)
      },
      JSON.stringify(result),
      true
    );
  }
}
