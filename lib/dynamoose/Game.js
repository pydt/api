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
  inProgress: Boolean,
  completed: Boolean,
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
      hasSurrendered: Boolean
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
    required: true
  },
  gameTurnRangeKey: {
    type: Number,
    required: true,
    default: 1
  }
});

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
  } while (game.players[playerIndex].hasSurrendered);
  
  return playerIndex;
};

Game.getPreviousPlayerIndex= game => {
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
  } while (game.players[playerIndex].hasSurrendered)

  return playerIndex;
};

module.exports = Game;
