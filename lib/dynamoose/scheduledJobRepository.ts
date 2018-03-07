import { IRepository, dynamoose } from './common';
import { ScheduledJob } from '../models';
import { Config } from '../config';
import { iocContainer } from '../ioc';

export const SCHEDULED_JOB_REPOSITORY_SYMBOL = Symbol('IScheduledJobRepository');

export interface IScheduledJobRepository extends IRepository<string, ScheduledJob> {
}

export const JOB_TYPES = {
  TURN_TIMER: 'TURN_TIMER'
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
  gameId: String
}) as IScheduledJobRepository;

iocContainer.bind<IScheduledJobRepository>(SCHEDULED_JOB_REPOSITORY_SYMBOL).toConstantValue(scheduledJobRepository);
