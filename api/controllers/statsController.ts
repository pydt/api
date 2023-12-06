import { Get, Route, Tags } from 'tsoa';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../lib/ioc';
import { GameTypeTurnData, TurnData, User } from '../../lib/models';
import * as moment from 'moment';
import { pick } from 'lodash';
import {
  IMiscDataRepository,
  MISC_DATA_REPOSITORY_SYMBOL
} from '../../lib/dynamoose/miscDataRepository';
import { GlobalStatsData } from '../../lib/models/miscData';

@Route('stats')
@Tags('stats')
@provideSingleton(StatsController)
export class StatsController {
  private cachedUsers?: User[];
  private cachedUsersDate?: Date;

  private cachedGlobalStats?: GlobalStatsData;
  private cachedGlobalStatsDate?: Date;

  constructor(
    @inject(MISC_DATA_REPOSITORY_SYMBOL) private miscDataRepository: IMiscDataRepository,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository
  ) {}

  private async refreshUsers() {
    if (
      !this.cachedUsersDate ||
      moment(this.cachedUsersDate).isBefore(moment().subtract(5, 'minutes'))
    ) {
      this.cachedUsers = await this.userRepository.usersWithTurnsPlayed();
      this.cachedUsersDate = new Date();
    }
  }

  private async refreshGlobalStats() {
    if (
      !this.cachedGlobalStatsDate ||
      moment(this.cachedGlobalStatsDate).isBefore(moment().subtract(5, 'minutes'))
    ) {
      this.cachedGlobalStats = (await this.miscDataRepository.getGlobalStats(false)).data;
      this.cachedGlobalStatsDate = new Date();
    }
  }

  @Get('users/{gameType}')
  public async users(gameType: string): Promise<UsersByGameTypeResponse> {
    await Promise.all([this.refreshUsers(), this.refreshGlobalStats()]);

    const pickTurnData = (data: TurnData) =>
      pick(
        data,
        'dayOfWeekQueue',
        'fastTurns',
        'firstTurnEndDate',
        'hourOfDayQueue',
        'lastTurnEndDate',
        'slowTurns',
        'timeTaken',
        'turnLengthBuckets',
        'turnsPlayed',
        'turnsSkipped',
        'yearBuckets'
      );

    return {
      global: pickTurnData(
        gameType === 'ALL'
          ? this.cachedGlobalStats
          : this.cachedGlobalStats.statsByGameType.find(x => x.gameType === gameType)
      ),
      users: this.cachedUsers
        .map(x => {
          const gameTypeStats = x.statsByGameType.find(y => y.gameType === gameType);
          const userGameData = gameType === 'ALL' ? x : gameTypeStats;

          if (!userGameData) {
            return null;
          }

          return {
            activeGames:
              gameType == 'ALL' ? x.activeGameIds?.length || 0 : gameTypeStats?.activeGames || 0,
            totalGames:
              gameType === 'ALL'
                ? (x.activeGameIds?.length || 0) + (x.inactiveGameIds?.length || 0)
                : gameTypeStats?.totalGames || 0,
            ...pickTurnData(userGameData),
            ...pick(x, 'steamId', 'avatarSmall', 'displayName')
          };
        })
        .filter(Boolean)
    };
  }

  @Get('global')
  public async global(): Promise<GlobalStatsData> {
    await this.refreshGlobalStats();

    return this.cachedGlobalStats;
  }
}

export interface UserTurnData
  extends TurnData,
    Pick<GameTypeTurnData, 'activeGames' | 'totalGames'>,
    Pick<User, 'steamId' | 'avatarSmall' | 'displayName'> {}

export interface UsersByGameTypeResponse {
  global: TurnData;
  users: UserTurnData[];
}
