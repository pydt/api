import { injectable } from 'inversify';
import { chunk } from 'lodash';
import * as moment from 'moment';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { inject } from '../../lib/ioc';
import { loggingHandler } from '../../lib/logging';
import { GameUtil } from '../../lib/util/gameUtil';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const cfcg = iocContainer.resolve(CheckForCompletedGames);
  await cfcg.execute();
});

@injectable()
export class CheckForCompletedGames {
  constructor(@inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository) {}

  public async execute() {
    const games = await this.gameRepository.incompleteGames();

    for (const curChunk of chunk(games, 75)) {
      for (const game of curChunk) {
        game.completed =
          game.inProgress &&
          (GameUtil.calculateIsCompleted(game) ||
            // mark stale games as completed...
            moment().diff(game.lastTurnEndDate || game.updatedAt, 'days') > 180);

        if (game.completed) {
          console.log(`Marking game ${game.gameId} as completed...`);
          await this.gameRepository.saveVersioned(game);
        }
      }
    }
  }
}
