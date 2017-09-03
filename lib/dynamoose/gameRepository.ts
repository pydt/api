
import { IRepository, dynamoose } from './common';
import { Game, User, GamePlayer } from '../models';
import { Config } from '../config';
import * as _ from 'lodash';

export interface IGameRepository extends IRepository<string, Game> {
  getGamesForUser(user: User): Promise<Game[]>;
  getCurrentPlayerIndex(game: Game): number;
  getNextPlayerIndex(game: Game): number;
  getPreviousPlayerIndex(game: Game): number;
  getHumans(game: Game, includeSurrendered: boolean): GamePlayer;
  playerIsHuman(player: GamePlayer): boolean;
}

export interface InternalGameRepository extends IGameRepository {
  origBatchGet(ids: string[]): Promise<Game[]>;
}

const internalGameRepository = dynamoose.createVersionedModel(Config.resourcePrefix() + 'game', {
  gameId: {
    type: String,
    hashKey: true,
    required: true
  },
  createdBySteamId: {
    type: String,
    required: true
  },
  dlc: [String],
  inProgress: Boolean,
  completed: Boolean,
  hashedPassword: String,
  displayName: {
    type: String,
    required: true
  },
  allowJoinAfterStart: Boolean,
  description: String,
  slots: Number,
  humans: Number,
  players: [
    {
      steamId: String,
      civType: String,
      hasSurrendered: Boolean,
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
  discourseTopicId: Number,
  currentPlayerSteamId: {
    type: String,
    required: true
  },
  turnTimerMinutes: Number,
  round: {
    type: Number,
    required: true,
    default: 1
  },
  gameTurnRangeKey: {
    type: Number,
    required: true,
    default: 1
  },
  gameSpeed: String,
  mapFile: String,
  mapSize: String
}) as InternalGameRepository;

export const gameRepository: IGameRepository = internalGameRepository;

if (!internalGameRepository.origBatchGet) {
  internalGameRepository.origBatchGet = internalGameRepository.batchGet;
}

gameRepository.batchGet = gameKeys => {
  return internalGameRepository.origBatchGet(gameKeys).then(games => {
    return _.orderBy(games, ['createdAt'], ['desc']);
  });
};

gameRepository.getGamesForUser = user => {
  const gameKeys = _.map(user.activeGameIds || [], gameId => {
    return { gameId: gameId }
  });

  if (gameKeys.length > 0) {
    return gameRepository.batchGet(gameKeys);
  } else {
    return Promise.resolve([]);
  }
};

gameRepository.getCurrentPlayerIndex = game => {
  return _.indexOf(game.players, _.find(game.players, player => {
    return player.steamId === game.currentPlayerSteamId;
  }));
};

gameRepository.getNextPlayerIndex = game => {
  let playerIndex = gameRepository.getCurrentPlayerIndex(game);
  let looped = false;

  do {
    playerIndex++;

    if (playerIndex >= game.players.length) {
      if (!looped) {
        playerIndex = 0;
        looped = true;
      } else {
        return -1;
      }
    }
  } while (!gameRepository.playerIsHuman(game.players[playerIndex]));

  return playerIndex;
};

gameRepository.getPreviousPlayerIndex = game => {
  let playerIndex = gameRepository.getCurrentPlayerIndex(game);
  let looped = false;

  do {
    playerIndex--;

    if (playerIndex < 0) {
      if (!looped) {
        playerIndex = game.players.length - 1;
        looped = true;
      } else {
        return -1;
      }
    }
  } while (!gameRepository.playerIsHuman(game.players[playerIndex]));

  return playerIndex;
};

gameRepository.getHumans = (game, includeSurrendered) => {
  return _.filter(game.players, player => {
    return player.steamId && (includeSurrendered || !player.hasSurrendered);
  });
};

gameRepository.playerIsHuman = player => {
  return player.steamId && !player.hasSurrendered;
};

module.exports = gameRepository;
