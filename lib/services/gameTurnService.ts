import { Game, GameTurn, User, GamePlayer, playerIsHuman } from '../models';
import { userRepository } from '../dynamoose/userRepository';
import { gameRepository } from '../dynamoose/gameRepository';
import { Config } from '../config';
import { gameTurnRepository } from '../dynamoose/gameTurnRepository';
import * as winston from 'winston';
import * as _ from 'lodash';
import * as AWS from 'aws-sdk';
import { sendSnsMessage } from '../sns';
const ses = new AWS.SES();

export async function moveToNextTurn(game: Game, gameTurn: GameTurn, user: User) {
  await Promise.all([
    closeGameTurn(game, gameTurn, user),
    createNextGameTurn(game)
  ]);

  await Promise.all([
    userRepository.saveVersioned(user),
    gameRepository.saveVersioned(game)
  ]);

  // Send an sns message that a turn has been completed.
  await sendSnsMessage(Config.resourcePrefix() + 'turn-submitted', 'turn-submitted', game.gameId);
}

async function closeGameTurn(game: Game, gameTurn: GameTurn, user: User) {
  gameTurn.endDate = new Date();

  gameTurnRepository.updateTurnStatistics(game, gameTurn, user);

  await gameTurnRepository.saveVersioned(gameTurn);
}

async function createNextGameTurn(game: Game) {
  const nextTurn: GameTurn = {
    gameId: game.gameId,
    turn: game.gameTurnRangeKey,
    round: game.round,
    playerSteamId: game.currentPlayerSteamId
  };

  try {
    await gameTurnRepository.saveVersioned(nextTurn);
  } catch (err) {
    // If error saving, delete the game turn and retry.  This is probably because
    // a previous save failed and the game turn already exists.
    winston.warn('Error saving game turn, deleting and trying again!', nextTurn);

    await gameTurnRepository.delete(nextTurn);
    await gameTurnRepository.saveVersioned(nextTurn);
  }
}

export async function defeatPlayers(game: Game, users: User[], newDefeatedPlayers: GamePlayer[]) {
  const promises = [];

  for (const defeatedPlayer of newDefeatedPlayers) {
    const defeatedUser = _.find(users, user => {
      return user.steamId === defeatedPlayer.steamId;
    });

    _.pull(defeatedUser.activeGameIds, game.gameId);

    defeatedUser.inactiveGameIds = defeatedUser.inactiveGameIds || [];
    defeatedUser.inactiveGameIds.push(game.gameId);

    promises.push(userRepository.saveVersioned(defeatedUser));

    for (const player of game.players) {
      const curUser = _.find(users, user => {
        return user.steamId === player.steamId;
      });

      if (curUser && curUser.emailAddress) {
        let desc = defeatedUser.displayName + ' has';

        if (player === defeatedPlayer) {
          desc = 'You have';
        }

        if (playerIsHuman(player) || player === defeatedPlayer) {
          const email = {
            Destination: {
              ToAddresses: [
                curUser.emailAddress
              ]
            },
            Message: {
              Body: {
                Html: {
                  Data: `<p><b>${desc}</b> been defeated in <b>${game.displayName}</b>!</p>`
                }
              }, Subject: {
                Data: `${desc} been defeated in ${game.displayName}!`
              }
            },
            Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
          };

          promises.push(ses.sendEmail(email).promise());
        }
      }
    }
  }

  await Promise.all(promises);
}
