'use strict';

const common = require('../../../lib/common.js');
const sns = require('../../../lib/sns.js');
const Game = require('../../../lib/dynamoose/Game.js');
const GameTurn = require('../../../lib/dynamoose/GameTurn.js');
const User = require('../../../lib/dynamoose/User.js');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ses = new AWS.SES();
const _ = require('lodash');

module.exports.handler = (event, context, cb) => {
  const body = JSON.parse(event.body);
  const gameId = event.pathParameters.gameId;
  const kickUserId = body.kickUserId;
  let userId = event.requestContext.authorizer.principalId;
  let game;
  let user;
  let users;
  let gameTurn;
  let s3Key;

  Game.get(gameId).then(_game => {
    game = _game;

    if (kickUserId) {
      if (game.createdBySteamId !== userId) {
        throw new common.PydtError('You must be the game creator to kick a user!');
      }

      const diffTime = new Date().getTime() - game.updatedAt.getTime();

      if (diffTime < 1000 * 60 * 60 * 24) {
        throw new common.PydtError(`You cannot kick a user if they haven't had 24 hours to play their turn.`);
      }

      userId = kickUserId;
    }

    const player = _.find(game.players, player => {
      return player.steamId === userId;
    });

    if (!player) {
      throw new common.PydtError('Player not in Game.');
    }

    if (player.hasSurrendered) {
      throw new common.PydtError('Player has already surrendered!');
    }

    if (game.gameTurnRangeKey <= 1) {
      throw new common.PydtError(`You can't surrender yet!  Create the game!`);
    }

    player.hasSurrendered = true;

    // The game is completed if every player has surrendered
    game.completed = _.every(game.players, player => {
      return player.hasSurrendered;
    });

    return User.getUsersForGame(game);
  })
  .then(_users => {
    users = _users;

    user = _.find(users, user => {
      return user.steamId === userId;
    });

    _.pull(user.activeGameIds, gameId);

    user.inactiveGameIds = user.inactiveGameIds || [];
    user.inactiveGameIds.push(gameId);

    return GameTurn.get({ gameId: gameId, turn: game.gameTurnRangeKey });
  })
  .then(_gameTurn => {
    gameTurn = _gameTurn;

    if (user.steamId === game.currentPlayerSteamId) {
      // Update the current player if it's the turn of the player who's surrendering
      const curIndex = Game.getCurrentPlayerIndex(game);
      const nextIndex = Game.getNextPlayerIndex(game);

      if (nextIndex >= 0) {
        game.currentPlayerSteamId = gameTurn.playerSteamId = game.players[nextIndex].steamId;
        
        if (nextIndex <= curIndex) {
          game.round = gameTurn.round++;
        }
      }

      return GameTurn.getAndUpdateSaveFileForGameState(game);
    }
  })
  .then(() => {
    return Promise.all([
      User.saveVersioned(user),
      Game.saveVersioned(game),
      GameTurn.saveVersioned(gameTurn)
    ]);
  })
  .then(() => {
    // Send an sns message that a turn has been completed.
    return sns.sendMessage(common.config.RESOURCE_PREFIX + 'turn-submitted', 'turn-submitted', game.gameId);
  })
  .then(() => {
    // Send an email to everyone else left in the game....
    const emailPromises = [];

    for (let player of game.players) {
      const curUser = _.find(users, user => {
        return user.steamId === player.steamId;
      });

      if (curUser.emailAddress) {
        let desc = 'surrendered';

        if (kickUserId) {
          desc = 'been kicked';
        }

        if (!player.hasSurrendered) {
          const email = {
            Destination: {
              ToAddresses: [
                curUser.emailAddress
              ]
            },
            Message: {
              Body: {
                Html: {
                  Data: `<p><b>${user.displayName}</b> has ${desc} from <b>${game.displayName}</b>. :(</p>`
                }
              }, Subject: {
                Data: `A player has ${desc} from ${game.displayName}!`
              }
            },
            Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
          };

          emailPromises.push(ses.sendEmail(email).promise());
        }

        if (player.steamId === kickUserId) {
          const email = {
            Destination: {
              ToAddresses: [
                curUser.emailAddress
              ]
            },
            Message: {
              Body: {
                Html: {
                  Data: `<p>You have been kicked from <b>${game.displayName}</b>. If you feel this was unwarranted, please contact mike@playyourdamnturn.com and we can try to mediate the situation.</p>`
                }
              }, Subject: {
                Data: `You have been kicked from ${game.displayName}!`
              }
            },
            Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
          };

          emailPromises.push(ses.sendEmail(email).promise());
        }
      }
    }

    return Promise.all(emailPromises);
  })
  .then(() => {
    common.lp.success(event, cb, game);
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};
