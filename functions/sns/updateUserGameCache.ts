import { IGameRepository, GAME_REPOSITORY_SYMBOL } from '../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { IUserService, USER_SERVICE_SYMBOL } from '../../lib/services/userService';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../lib/s3Provider';
import { sendSnsMessage } from '../../lib/sns';
import { loggingHandler } from '../../lib/logging';
import { Config } from '../../lib/config';
import { User, Game } from '../../lib/models';
import * as _ from 'lodash';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const gameRepository = iocContainer.get<IGameRepository>(GAME_REPOSITORY_SYMBOL);
  const userService = iocContainer.get<IUserService>(USER_SERVICE_SYMBOL);
  const s3 = iocContainer.get<IS3Provider>(S3_PROVIDER_SYMBOL);

  async function updateUsers(users: User[]) {
    const gameIds = _.compact(_.uniq(_.concat(_.flatMap(users, 'activeGameIds') as string[])));
    const games = await gameRepository.batchGet(gameIds);
    await Promise.all(_.map(users, user => {
      return updateUser(user, games);
    }));
  }
  
  async function updateUser(user: User, games: Game[]) {
    const result = _.filter(games, game => {
      return _.includes(user.activeGameIds, game.gameId);
    });

    await s3.putObject({
      Bucket: Config.resourcePrefix() + 'saves',
      Key: userService.createS3GameCacheKey(user.steamId)
    }, JSON.stringify(result), true);
  }

  const gameId = event.Records[0].Sns.Message;
  const game = await gameRepository.get(gameId);

  if (!game || !game.inProgress) {
    return;
  }

  const users = await userService.getUsersForGame(game);

  if (!users || !users.length) {
    return;
  }

  await updateUsers(users);

  // Send an sns message that the cache has been updated
  await sendSnsMessage(Config.resourcePrefix() + 'user-game-cache-updated', 'user-game-cache-updated', game.gameId);
});
