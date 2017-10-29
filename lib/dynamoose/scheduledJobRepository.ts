import { IRepository, dynamoose } from './common';
import { ScheduledJob } from '../models';
import { Config } from '../config';

export interface IScheduledJobRepository extends IRepository<string, ScheduledJob> {
}

export const scheduledJobRepository = dynamoose.createVersionedModel(Config.resourcePrefix() + 'scheduled-job', {
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

export const JOB_TYPES = {
  TURN_TIMER: 'TURN_TIMER'
};
