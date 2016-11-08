'use strict';

const common = require('../../lib/common.js');
const AWS = require('aws-sdk');
const Game = require('../../lib/dynamoose/Game.js');
const ScheduledJob = require('../../lib/dynamoose/ScheduledJob.js');

module.exports.handler = (event, context, cb) => {
  const gameId = event.Records[0].Sns.Message;
  let game;

  Game.get(gameId).then(_game => {
    game = _game

    if (!game || !game.inProgress || !game.turnTimerMinutes) {
      return null;
    }

    return ScheduledJob.saveVersioned(new ScheduledJob({
      jobType: ScheduledJob.JOB_TYPES.TURN_TIMER,
      scheduledTime: new Date(new Date().getTime() + game.turnTimerMinutes * 60000),
      gameId: gameId
    }));

    return User.get(game.currentPlayerSteamId);
  })
  .catch(err => {
    cb(err);
  });
};
