import { injectable } from 'inversify';
import * as moment from 'moment';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { inject } from '../../lib/ioc';
import { loggingHandler } from '../../lib/logging';
import { GameUtil } from '../../lib/util/gameUtil';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../lib/snsProvider';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const cfcg = iocContainer.resolve(CheckForCompletedGames);
  await cfcg.execute(event.mode);
});

@injectable()
export class CheckForCompletedGames {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider
  ) {}

  public async execute(mode?: 'UPDATE_FINALIZED') {
    if (mode === 'UPDATE_FINALIZED') {
      const games = await this.gameRepository.allGames();

      for (const game of games) {
        if (game.gameTurnRangeKey > 5 && !game.finalized && GameUtil.calculateIsCompleted(game)) {
          game.finalized = true;
          console.log(`Marking game ${game.gameId} as finalized...`);
          await this.gameRepository.saveVersioned(game);
          await this.sns.gameFinalized(game);

          // Throttle a bit
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } else {
      const games = await this.gameRepository.incompleteGames();

      for (const game of games) {
        game.completed =
          game.inProgress &&
          (GameUtil.calculateIsCompleted(game) ||
            // mark stale games as completed...
            moment().diff(game.lastTurnEndDate || game.updatedAt, 'days') > 180);

        if (game.completed) {
          console.log(`Marking game ${game.gameId} as completed...`);
          await this.gameRepository.saveVersioned(game);

          // Throttle a bit
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }
  }
}
