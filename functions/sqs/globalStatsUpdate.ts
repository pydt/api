import { injectable } from 'inversify';
import { inject } from '../../lib/ioc';
import { loggingHandler } from '../../lib/logging';
import {
  IMiscDataRepository,
  MISC_DATA_REPOSITORY_SYMBOL
} from '../../lib/dynamoose/miscDataRepository';
import { GlobalStatsUpdateMessage } from '../../lib/sqsProvider';
import { StatsUtil } from '../../lib/util/statsUtil';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const uugc = iocContainer.resolve(GlobalStatsUpdate);
  await uugc.execute(event.Records.map(x => JSON.parse(x.body)));
  return {};
});

@injectable()
export class GlobalStatsUpdate {
  constructor(
    @inject(MISC_DATA_REPOSITORY_SYMBOL) private miscDataRepository: IMiscDataRepository
  ) {}

  public async execute(messages: GlobalStatsUpdateMessage[]) {
    const globalStats = await this.miscDataRepository.getGlobalStats(true);

    for (const message of messages) {
      message.turn.endDate = message.turn.endDate ? new Date(message.turn.endDate) : undefined;
      message.turn.startDate = message.turn.startDate
        ? new Date(message.turn.startDate)
        : undefined;

      StatsUtil.updateTurnData(message.turn, globalStats.data, message.undo);

      StatsUtil.updateTurnData(
        message.turn,
        StatsUtil.getGameStats(globalStats.data, message.gameType),
        message.undo
      );
    }

    await this.miscDataRepository.saveVersioned(globalStats);
  }
}
