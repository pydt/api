import { dynamoose, IRepository } from './common';
import { Config } from '../config';
import { User } from '../models/user';
import { Game } from '../models/game';
import { iocContainer } from '../ioc';
import * as _ from 'lodash';

export const USER_REPOSITORY_SYMBOL = Symbol('IUserRepository');

export interface IUserRepository extends IRepository<string, User> {
  createS3GameCacheKey(steamId: string): string;
  getUsersForGame(game: Game): Promise<User[]>;
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

userRepository.createS3GameCacheKey = (steamId) => {
  return steamId + '/' + 'gameCache.json';
};

userRepository.getUsersForGame = game => {
  const steamIds = _.compact(_.map(game.players, 'steamId'));
  return userRepository.batchGet(steamIds).then(users => {
    // make sure they're sorted correctly...
    const playersWithSteamIds = _.filter(game.players, player => {
      return !!player.steamId;
    });

    return _.map(playersWithSteamIds, player => {
      return _.find(users, user => {
        return user.steamId === player.steamId;
      });
    });
  });
};

iocContainer.bind<IUserRepository>(USER_REPOSITORY_SYMBOL).toConstantValue(userRepository);
