import { Config } from '../config';
import { provideSingleton } from '../ioc';
import { ScheduledJob, ScheduledJobKey } from '../models';
import { BaseDynamooseRepository, IRepository } from './common';

export const SCHEDULED_JOB_REPOSITORY_SYMBOL = Symbol('IScheduledJobRepository');

export interface IScheduledJobRepository extends IRepository<ScheduledJobKey, ScheduledJob> {
  getWaitingJobs(jobType: string): Promise<ScheduledJob[]>;
}

export const JOB_TYPES = {
  TURN_TIMER: 'TURN_TIMER',
  TURN_TIMER_VACATION: 'TURN_TIMER_VACATION'
};

@provideSingleton(SCHEDULED_JOB_REPOSITORY_SYMBOL)
export class ScheduledJobRepository extends BaseDynamooseRepository<ScheduledJobKey, ScheduledJob> implements IScheduledJobRepository {
  constructor() {
    super(Config.resourcePrefix + 'scheduled-job', {
      jobType: {
        type: String,
        hashKey: true
      },
      scheduledTime: {
        type: Date,
        rangeKey: true
      },
      gameIds: [String]
    });
  }

  getWaitingJobs(jobType: string) {
    return this.getAllPaged(
      this.query('jobType')
        .eq(jobType)
        .where('scheduledTime')
        .lt(new Date()));
  }
}
