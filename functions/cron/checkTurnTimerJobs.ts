import { gameRepository } from '../../lib/dynamoose/gameRepository';
import { gameTurnRepository } from '../../lib/dynamoose/gameTurnRepository';
import { scheduledJobRepository, JOB_TYPES } from '../../lib/dynamoose/scheduledJobRepository';
import { userRepository } from '../../lib/dynamoose/userRepository';
import { moveToNextTurn } from '../../lib/services/gameTurnService';
import { ScheduledJob } from '../../lib/models';
import { Config } from '../../lib/config';
import * as winston from 'winston';
import * as _ from 'lodash';
import * as AWS from 'aws-sdk';
import * as civ6 from 'civ6-save-parser';
const s3 = new AWS.S3();
const ses = new AWS.SES();

export async function handler(event, context, cb) {
  try {
    const jobs: ScheduledJob[] = await scheduledJobRepository.query('jobType')
      .eq(JOB_TYPES.TURN_TIMER)
      .where('scheduledTime')
      .lt(new Date())
      .exec();

    if (jobs && jobs.length) {
      await processJobs(jobs);
    }

    cb();
  } catch (err) {
    winston.error(err);
    cb(err);
  }
}

//////

async function processJobs(jobs: ScheduledJob[]) {
  const gameIds = _.uniq(_.map(jobs, 'gameId'));
  const games = await gameRepository.batchGet(gameIds);

  await Promise.all(_.map(games, async game => {
    if (game.turnTimerMinutes) {
      await checkTurnTimer(game);
    }
  }));
  
  await scheduledJobRepository.batchDelete(jobs);
}

async function checkTurnTimer(game) {
  const turn = await gameTurnRepository.get({ gameId: game.gameId, turn: game.gameTurnRangeKey });
  
  if (!turn.endDate  && new Date().getTime() - turn.startDate.getTime() > game.turnTimerMinutes * 60000 ) {
    await skipTurn(game, turn);
  }
}

async function skipTurn(game, turn) {
  const currentPlayerSteamId = game.currentPlayerSteamId;
  turn.skipped = true;

  await gameTurnRepository.saveVersioned(turn);
  const data = await s3.getObject({
    Bucket: Config.resourcePrefix() + 'saves',
    Key: gameTurnRepository.createS3SaveKey(game.gameId, game.gameTurnRangeKey)
  }).promise();

  if (!data && !data.Body) {
    throw new Error('File doesn\'t exist?');
  }

  const civIndex = (game.gameTurnRangeKey - 1) % game.players.length;
  const wrapper = civ6.parse(data.Body);
  civ6.modifyChunk(wrapper.chunks, wrapper.parsed.CIVS[civIndex].ACTOR_AI_HUMAN, 1);

  await s3.putObject({
    Bucket: Config.resourcePrefix() + 'saves',
    Key: gameTurnRepository.createS3SaveKey(game.gameId, game.gameTurnRangeKey + 1),
    Body: Buffer.concat(wrapper.chunks)
  }).promise();
  
  const user = await userRepository.get(currentPlayerSteamId);
  await moveToNextTurn(game, turn, user);

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

  await ses.sendEmail(email).promise();
}
