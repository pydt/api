import { injectable } from 'inversify';
import { inject } from '../../lib/ioc';
import { loggingHandler } from '../../lib/logging';
import {
  IMiscDataRepository,
  MISC_DATA_REPOSITORY_SYMBOL
} from '../../lib/dynamoose/miscDataRepository';
import { GameTurnService } from '../../lib/services/gameTurnService';
import { GlobalStatsUpdateMessage } from '../../lib/sqsProvider';
import { UserUtil } from '../../lib/util/userUtil';

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

      GameTurnService.updateTurnData(message.turn, globalStats.data, message.undo);

      GameTurnService.updateTurnData(
        message.turn,
        UserUtil.getUserGameStats(globalStats.data, message.gameType),
        message.undo
      );
    }

    await this.miscDataRepository.saveVersioned(globalStats);
  }
}
