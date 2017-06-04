'use strict';

const common = require('../../../../lib/common.js');
const sns = require('../../../../lib/sns.js');
const Game = require('../../../../lib/dynamoose/Game.js');
const GameTurn = require('../../../../lib/dynamoose/GameTurn.js');
const User = require('../../../../lib/dynamoose/User.js');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ses = new AWS.SES();
const _ = require('lodash');
const zlib = require("zlib");

module.exports.handler = (event, context, cb) => {
  const gameId = event.pathParameters.gameId;
  const userId = event.requestContext.authorizer.principalId;
  
  let game, gameTurn, users, user;

  Game.get(gameId).then(_game => {
    game = _game;
    if (game.currentPlayerSteamId !== userId) {
      throw new Error('It\'s not your turn!');
    }

    return GameTurn.get({ gameId: game.gameId, turn: game.gameTurnRangeKey });
  })
  .then(_gameTurn => {
    game.gameTurnRangeKey++;
    gameTurn = _gameTurn;
    return User.getUsersForGame(game);
  })
  .then(_users => {
    users = _users;

    user = _.find(users, user => {
      return user.steamId === userId;
    });

    return s3.getObject({
      Bucket: common.config.RESOURCE_PREFIX + 'saves',
      Key: GameTurn.createS3SaveKey(gameId, game.gameTurnRangeKey)
    }).promise();
  })
  .then(data => {
    if (!data && !data.Body) {
      throw new Error('File doesn\'t exist?');
    }

    let buffer = data.Body;

    // Attempt to gunzip...
    try {
      buffer = zlib.unzipSync(data.Body);
      console.log('unzip succeeded!');
    } catch (e) {
      // If unzip fails, assume raw save file was uploaded...
      console.log('unzip failed :(', e);
    }

    let wrapper = GameTurn.parseSaveFile(buffer, game);
    const parsed = wrapper.parsed;
    
    const numCivs = parsed.CIVS.length;
    const parsedRound = parsed.GAME_TURN.data;
    const gameDlc = game.dlc || [];
    const parsedDlc = [];

    if (parsed.MOD_BLOCK_1) {
      for (let mod of parsed.MOD_BLOCK_1.data) {
        // Official DLC starts with a localization string, assuming non-official doesn't?
        const modTitle = mod.MOD_TITLE.data;

        // Ignore scenarios so we don't have to open that can of worms...
        if (modTitle.indexOf('{"LOC_') === 0 && modTitle.indexOf('_SCENARIO_') < 0) {
          parsedDlc.push(mod.MOD_ID.data);
        }
      }
    }

    if (gameDlc.length !== parsedDlc.length || _.difference(gameDlc, parsedDlc).length) {
      throw new common.PydtError(`DLC mismatch!  Please ensure that you have the correct DLC enabled (or disabled)!`);
    }

    if (numCivs !== game.slots) {
      throw new common.PydtError(`Invalid number of civs in save file! (actual: ${numCivs}, expected: ${game.slots})`);
    }

    if (game.gameSpeed && game.gameSpeed !== parsed.GAME_SPEED.data) {
      throw new common.PydtError(`Invalid game speed in save file!  (actual: ${parsed.GAME_SPEED.data}, expected: ${game.gameSpeed})`);
    }

    if (game.mapFile && parsed.MAP_FILE.data.indexOf(game.mapFile) < 0) {
      throw new common.PydtError(`Invalid map file in save file! (actual: ${parsed.MAP_FILE.data}, expected: ${game.mapFile})`);
    }

    if (game.mapSize && game.mapSize !== parsed.MAP_SIZE.data) {
      throw new common.PydtError(`Invalid map size in save file! (actual: ${parsed.MAP_SIZE.data}, expected: ${game.mapSize})`);
    }

    const newDefeatedPlayers = [];

    for (let i = parsed.CIVS.length - 1; i >= 0; i--) {
      const parsedCiv = parsed.CIVS[i];

      if (game.players[i]) {
        const actualCiv = parsedCiv.LEADER_NAME.data;
        const expectedCiv = game.players[i].civType; 

        if (expectedCiv === 'LEADER_RANDOM') {
          game.players[i].civType = actualCiv;
        } else if (actualCiv !== expectedCiv) {
          throw new common.PydtError(`Incorrect civ type in save file! (actual: ${actualCiv}, expected: ${expectedCiv})`);
        }

        if (Game.playerIsHuman(game.players[i])) {
          if (parsedCiv.ACTOR_AI_HUMAN === 1) {
            throw new common.PydtError(`Expected civ ${i} to be human!`);
          }

          if (parsedCiv.PLAYER_ALIVE && !parsedCiv.PLAYER_ALIVE.data) {
            // Player has been defeated!
            game.players[i].hasSurrendered = true;
            newDefeatedPlayers.push(game.players[i]);
          }
        } else {
          if (parsedCiv.ACTOR_AI_HUMAN === 3) {
            throw new common.PydtError(`Expected civ ${i} to be AI!`);
          }
        }
      } else {
        if (parsedCiv.ACTOR_AI_HUMAN === 3) {
          throw new common.PydtError(`Expected civ ${i} to be AI!`);
        }

        game.players[i] = {
          civType: parsedCiv.LEADER_NAME.data
        };
      }
    }

    let expectedRound = gameTurn.round;

    if (gameTurn.turn === 1) {
      // When starting a game, take whatever round is in the file.  This allows starting in different eras.
      expectedRound = parsedRound;
    }
    
    let nextPlayerIndex = Game.getNextPlayerIndex(game);

    if (nextPlayerIndex <= Game.getCurrentPlayerIndex(game)) {
      expectedRound++;
    }

    if (expectedRound != parsedRound) {
      throw new common.PydtError(`Incorrect game turn in save file! (actual: ${parsedRound}, expected: ${expectedRound})`);
    }

    const isCurrentTurn = parsed.CIVS[nextPlayerIndex].IS_CURRENT_TURN;

    if (!isCurrentTurn || !isCurrentTurn.data) {
      throw new common.PydtError('Incorrect player turn in save file!');
    }
    
    game.currentPlayerSteamId = game.players[Game.getNextPlayerIndex(game)].steamId;
    game.round = expectedRound;

    return GameTurn.updateSaveFileForGameState(game, users, wrapper).then(() => {
      return module.exports.moveToNextTurn(game, gameTurn, user);
    }).then(() => {
      if (newDefeatedPlayers.length) {
        return defeatPlayers(game, users, newDefeatedPlayers);
      }
    }).then(() => {
      common.lp.success(event, cb, game);
    });
  })
  .catch(err => {
    common.lp.error(event, cb, err);
  });
};

////////

module.exports.moveToNextTurn = (game, gameTurn, user) => {
  return Promise.all([
    closeGameTurn(game, gameTurn, user),
    createNextGameTurn(game)
  ])
  .then(() => {
    // Finally, update the game and user!
    return Promise.all([
      User.saveVersioned(user),
      Game.saveVersioned(game)
    ]); 
  })
  .then(() => {
    // Send an sns message that a turn has been completed.
    return sns.sendMessage(common.config.RESOURCE_PREFIX + 'turn-submitted', 'turn-submitted', game.gameId);
  });
}

function closeGameTurn(game, gameTurn, user) {
  gameTurn.endDate = new Date();

  GameTurn.updateTurnStatistics(game, gameTurn, user);

  return GameTurn.saveVersioned(gameTurn);
}

function createNextGameTurn(game) {
  const nextTurn = new GameTurn({
    gameId: game.gameId,
    turn: game.gameTurnRangeKey,
    round: game.round,
    playerSteamId: game.currentPlayerSteamId
  });

  return GameTurn.saveVersioned(nextTurn)
    .catch(err => {
      // If error saving, delete the game turn and retry.  This is probably because
      // a previous save failed and the game turn already exists.
      common.rollbarMessage("Error saving game turn, deleting and trying again!", "warning", nextTurn);

      return GameTurn.delete(nextTurn).then(() => {
        return GameTurn.saveVersioned(nextTurn);
      });
    });
}

function defeatPlayers(game, users, newDefeatedPlayers) {
  const promises = [];

  for (let defeatedPlayer of newDefeatedPlayers) {
    const defeatedUser = _.find(users, user => {
      return user.steamId === defeatedPlayer.steamId;
    });

    _.pull(defeatedUser.activeGameIds, game.gameId);

    defeatedUser.inactiveGameIds = defeatedUser.inactiveGameIds || [];
    defeatedUser.inactiveGameIds.push(game.gameId);
    
    promises.push(User.saveVersioned(defeatedUser));

    for (let player of game.players) {
      const curUser = _.find(users, user => {
        return user.steamId === player.steamId;
      });

      if (curUser && curUser.emailAddress) {
        let desc = defeatedUser.displayName + ' has';

        if (player === defeatedPlayer) {
          desc = 'You have';
        }

        if (Game.playerIsHuman(player) || player === defeatedPlayer) {
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

  return Promise.all(promises);
}