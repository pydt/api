import { dynamoose, IRepository, IInternalRepository } from './common';
import { Config } from '../config';
import { User } from '../models/user';
import { iocContainer } from '../ioc';

export const USER_REPOSITORY_SYMBOL = Symbol('IUserRepository');

export interface IUserRepository extends IRepository<string, User> {
  allUsers(): Promise<User[]>;
  usersWithTurnsPlayed(): Promise<User[]>;
}

interface InternalUserRepository extends IUserRepository, IInternalRepository<string, User> {
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
  steamProfileUrl: String,
  emailAddress: String,
  activeGameIds: [String],
  inactiveGameIds: [String],
  vacationMode: Boolean,
  timezone: String,
  comments: String,
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
  },
  statsByGameType: [
    {
      gameType: String,
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
    }
  ],
  dataVersion: Number
}) as InternalUserRepository;

async function scanAllUsers(removeEmail: boolean, createScanQuery: () => any) {
  const result: User[] = [];
  let lastKey;

  do {
    let scan = createScanQuery();

    if (lastKey) {
      scan = scan.startAt(lastKey);
    }

    const users: User[] = await scan.exec();

    for (const user of users) {
      if (removeEmail) {
        delete user.emailAddress; // make sure email address isn't returned!
      }

      result.push(user);
    }

    lastKey = (users as any).lastKey;
  } while (lastKey);

  return result;
}

userRepository.allUsers = () => {
  return scanAllUsers(false, () => {
    return userRepository.scan();
  });
}

userRepository.usersWithTurnsPlayed = () => {
  return scanAllUsers(true, () => {
    return userRepository.scan().where('turnsPlayed').gt(0);
  });
};

iocContainer.bind<IUserRepository>(USER_REPOSITORY_SYMBOL).toConstantValue(userRepository);
