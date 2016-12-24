'use strict';

const common = require('../../lib/common.js');
const _ = require('lodash');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ses = new AWS.SES();
const Game = require('../../lib/dynamoose/Game.js');
const User = require('../../lib/dynamoose/User.js');
const GameTurn = require('../../lib/dynamoose/GameTurn.js');
const ScheduledJob = require('../../lib/dynamoose/ScheduledJob.js');
const civ6 = require('civ6-save-parser');
const finishSubmit = require('../http/game/turn/finishSubmit.js');

module.exports.handler = (event, context, cb) => {
  let jobs;

  ScheduledJob.query('jobType')
    .eq(ScheduledJob.JOB_TYPES.TURN_TIMER)
    .where('scheduledTime')
    .lt(new Date())
    .exec()
  .then(_jobs => {
    jobs = _jobs;

    if (jobs && jobs.length) {
      return processJobs(jobs);
    }
  })
  .catch(err => {
    common.generalError(cb, err);
  });
};

//////

function processJobs(jobs) {
  const gameIds = _.uniq(_.map(jobs, 'gameId'));

  return Game.batchGet(gameIds)
    .then(games => {
      return Promise.all(_.map(games, game => {
        if (game.turnTimerMinutes) {
          return checkTurnTimer(game);
        }
      }));
    })
    .then(() => {
      return ScheduledJob.batchDelete(jobs);
    });
}

function checkTurnTimer(game) {
  return GameTurn.get({ gameId: game.gameId, turn: game.gameTurnRangeKey }).then(turn => {
    if (!turn.endDate  && new Date().getTime() - turn.startDate.getTime() > game.turnTimerMinutes * 60000 ) {
      return skipTurn(game, turn);
    }
  });
}

function skipTurn(game, turn) {
  let user;
  const currentPlayerSteamId = game.currentPlayerSteamId;
  turn.skipped = true;

  return GameTurn.saveVersioned(turn).then(() => {
    return s3.getObject({
      Bucket: common.config.RESOURCE_PREFIX + 'saves',
      Key: GameTurn.createS3SaveKey(game.gameId, game.gameTurnRangeKey)
    }).promise();
  })
  .then(data => {
    if (!data && !data.Body) {
      throw new Error('File doesn\'t exist?');
    }

    const civIndex = (game.gameTurnRangeKey - 1) % game.players.length;
    const wrapper = civ6.parse(data.Body);
    civ6.modifyChunk(wrapper.chunks, parsed.CIVS[civIndex].ACTOR_AI_HUMAN, 1);

    return s3.putObject({
      Bucket: common.config.RESOURCE_PREFIX + 'saves',
      Key: GameTurn.createS3SaveKey(game.gameId, game.gameTurnRangeKey + 1),
      Body: Buffer.concat(wrapper.chunks)
    }).promise();
  })
  .then(() => {
    return User.get(currentPlayerSteamId);
  })
  .then(_user => {
    user = _user;
    return finishSubmit.moveToNextTurn(game, turn, user);
  })
  .then(() => {
    const email = {
      Destination: {
        ToAddresses: [
          user.emailAddress
        ]
      },
      Message: {
        Body: {
          Html: {
            Data: `<p>You've been skipped!  Try harder next time!`
          }
        }, Subject: {
          Data: 'You have been skipped in ' + game.displayName + '!'
        }
      },
      Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
    };

    return ses.sendEmail(email).promise();
  });
}
