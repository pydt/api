'use strict';

const common = require('../common.js');
const dynamoose = require('./common.js');
const _ = require('lodash');

const Game = dynamoose.createVersionedModel(common.config.RESOURCE_PREFIX + 'game', {
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
});

Game._origBatchGet = Game.batchGet;

Game.batchGet = gameKeys => {
  return Game._origBatchGet(gameKeys).then(games => {
    return _.orderBy(games, ['createdAt'], ['desc']);
  });
};

Game.getGamesForUser = user => {
  const gameKeys = _.map(user.activeGameIds || [], gameId => {
    return { gameId: gameId }
  });

  if (gameKeys.length > 0) {
    return Game.batchGet(gameKeys);
  } else {
    return Promise.resolve([]);
  }
};

Game.getCurrentPlayerIndex = game => {
  return _.indexOf(game.players, _.find(game.players, player => {
    return player.steamId === game.currentPlayerSteamId;
  }));
};

Game.getNextPlayerIndex = game => {
  let playerIndex = Game.getCurrentPlayerIndex(game);
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
  } while (!Game.playerIsHuman(game.players[playerIndex]));
  
  return playerIndex;
};

Game.getPreviousPlayerIndex = game => {
  let playerIndex = Game.getCurrentPlayerIndex(game);
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
  } while (!Game.playerIsHuman(game.players[playerIndex]));

  return playerIndex;
};

Game.getHumans = (game, includeSurrendered) => {
  return _.filter(game.players, player => {
    return player.steamId && (includeSurrendered || !player.hasSurrendered);
  });
};

Game.playerIsHuman = player => {
  return player.steamId && !player.hasSurrendered;
};

module.exports = Game;
