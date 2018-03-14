import { dynamoose, IRepository } from './common';
import { Config } from '../config';
import { User } from '../models/user';
import { iocContainer } from '../ioc';

export const USER_REPOSITORY_SYMBOL = Symbol('IUserRepository');

export interface IUserRepository extends IRepository<string, User> {
}

const userRepository = dynamoose.createVersionedModel(Config.resourcePrefix() + 'user', {
  steamId: {
    type: String,
    hashKey: true
  },
  displayName: {
    type: String,
    required: true
  },
  avatarSmall: String,
  avatarMedium: String,
  avatarFull: String,
  emailAddress: String,
  activeGameIds: [String],
  inactiveGameIds: [String],
  turnsPlayed: {
    type: Number,
    default: 0
  },
  turnsSkipped: {
    type: Number,
    default: 0
  },
  timeTaken: {
    type: Number,
    default: 0
  },
  fastTurns: {
    type: Number,
    default: 0
  },
  slowTurns: {
    type: Number,
    default: 0
  }
}) as IUserRepository;

iocContainer.bind<IUserRepository>(USER_REPOSITORY_SYMBOL).toConstantValue(userRepository);
