import { Config } from '../config';
import { provideSingleton } from '../ioc';
import { GlobalStats, MiscData } from '../models/miscData';
import { StatsUtil } from '../util/statsUtil';
import { BaseDynamooseRepository, IRepository } from './common';

export const MISC_DATA_REPOSITORY_SYMBOL = Symbol('IMiscDataRepository');

export interface IMiscDataRepository extends IRepository<string, MiscData<unknown>> {
  getGlobalStats(consistent: boolean): Promise<GlobalStats>;
}

@provideSingleton(MISC_DATA_REPOSITORY_SYMBOL)
export class MiscDataRepository
  extends BaseDynamooseRepository<string, MiscData<unknown>>
  implements IMiscDataRepository
{
  constructor() {
    super(Config.resourcePrefix + 'misc-data', {
      key: {
        type: String,
        hashKey: true
      },
      data: {
        type: String,
        get: (value: string) => (value ? JSON.parse(value) : {}),
        pydtSet: (value: unknown) => JSON.stringify(value)
      }
    });
  }

  async getGlobalStats(consistent: boolean) {
    const result = ((await this.get('GLOBAL_STATS', consistent)) || {
      key: 'GLOBAL_STATS',
      data: {
        turnLengthBuckets: {},
        yearBuckets: {}
      }
    }) as GlobalStats;

    StatsUtil.fixTurnDataDates(result.data);

    for (const gameType of result.data.statsByGameType || []) {
      StatsUtil.fixTurnDataDates(gameType);
    }

    return result;
  }
}
