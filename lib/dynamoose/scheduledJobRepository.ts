import { Config } from '../config';
import { iocContainer } from '../ioc';
import { ScheduledJob, ScheduledJobKey } from '../models';
import { dynamoose, getAllPaged, IInternalRepository, IRepository } from './common';

export const SCHEDULED_JOB_REPOSITORY_SYMBOL = Symbol('IScheduledJobRepository');

export interface IScheduledJobRepository extends IRepository<ScheduledJobKey, ScheduledJob> {
  getWaitingJobs(jobType: string): Promise<ScheduledJob[]>;
}

interface InternalScheduledJobRepository extends IScheduledJobRepository, IInternalRepository<ScheduledJobKey, ScheduledJob> {
}

export const JOB_TYPES = {
  TURN_TIMER: 'TURN_TIMER',
  TURN_TIMER_VACATION: 'TURN_TIMER_VACATION'
};

const scheduledJobRepository = dynamoose.createVersionedModel(Config.resourcePrefix() + 'scheduled-job', {
  jobType: {
    type: String,
    hashKey: true
  },
  scheduledTime: {
    type: Date,
    rangeKey: true
  },
  gameIds: [String]
}) as InternalScheduledJobRepository;

scheduledJobRepository.getWaitingJobs = (jobType: string) => {
  return getAllPaged<ScheduledJob>(
    scheduledJobRepository.query('jobType')
      .eq(jobType)
      .where('scheduledTime')
      .lt(new Date()));
}

iocContainer.bind<IScheduledJobRepository>(SCHEDULED_JOB_REPOSITORY_SYMBOL).toConstantValue(scheduledJobRepository);
