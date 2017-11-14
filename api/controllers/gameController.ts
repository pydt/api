import { Route, Get, Response, Request, Post, Body, Security } from 'tsoa';
import { provideSingleton } from '../../lib/ioc';
import {
  Game, BaseGame, GamePlayer, GameTurn, getHumans, playerIsHuman, getNextPlayerIndex, getCurrentPlayerIndex, getPreviousPlayerIndex
} from '../../lib/models';
import { userRepository } from '../../lib/dynamoose/userRepository';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../framework';
import { gameRepository } from '../../lib/dynamoose/gameRepository';
import { addDiscourseGameTopic } from '../../lib/discourse';
import { deleteGame } from '../../lib/services/gameService';
import { gameTurnRepository } from '../../lib/dynamoose/gameTurnRepository';
import { sendSnsMessage } from '../../lib/sns';
import { Config } from '../../lib/config';
import * as _ from 'lodash';
import * as uuid from 'uuid/v4';
import * as bcrypt from 'bcryptjs';
import * as AWS from 'aws-sdk';
import * as zlib from 'zlib';
import { moveToNextTurn, defeatPlayers } from '../../lib/services/gameTurnService';
import { pydtLogger } from '../../lib/logging';
const s3 = new AWS.S3();
const ses = new AWS.SES();

@Route('game')
@provideSingleton(GameController)
export class GameController {
  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/changeCiv')
  public async changeCiv(@Request() request: HttpRequest, gameId: string, @Body() body: ChangeCivRequestBody): Promise<Game> {
    const game = await gameRepository.get(gameId);

    if (game.inProgress) {
      throw new HttpResponseError(400, 'Game in Progress');
    }

    if (body.playerCiv !== 'LEADER_RANDOM' && _.map(game.players, 'civType').indexOf(body.playerCiv) >= 0) {
      throw new HttpResponseError(400, 'Civ already in Game');
    }

    const player = _.find(game.players, p => {
      return p.steamId === request.user;
    });

    if (!player) {
      throw new HttpResponseError(400, 'Player not in Game');
    }

    player.civType = body.playerCiv;

    return gameRepository.saveVersioned(game);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('create')
  public async create(@Request() request: HttpRequest, @Body() body: CreateGameRequestBody): Promise<Game> {
    const user = await userRepository.get(request.user);

    if (!user.emailAddress) {
      throw new HttpResponseError(400, 'You need to set a notification email address before you can create a game.');
    }

    const games = await gameRepository.getGamesForUser(user);
    const hasFormingGame = _.some(games, game => {
      return game.createdBySteamId === request.user && !game.inProgress;
    });

    if (hasFormingGame) {
      throw new HttpResponseError(
        400,
        `You cannot create a new game at the moment because you already have one game that hasn't been started yet!`
      );
    }

    const newGame: Game = {
      gameId: uuid(),
      createdBySteamId: user.steamId,
      currentPlayerSteamId: user.steamId,
      dlc: body.dlc,
      players: [{
        steamId: user.steamId,
        civType: body.player1Civ
      }],
      displayName: body.displayName,
      description: body.description,
      slots: body.slots,
      humans: body.humans,
      gameSpeed: body.gameSpeed,
      mapFile: body.mapFile,
      mapSize: body.mapSize
    };

    const topic = await addDiscourseGameTopic(newGame);

    if (topic) {
      newGame.discourseTopicId = topic.topic_id;
    }

    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      newGame.hashedPassword = await bcrypt.hash(body.password, salt);
    }

    await gameRepository.saveVersioned(newGame);

    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds.push(newGame.gameId);
    await userRepository.saveVersioned(user);

    return newGame;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/delete')
  public async delete(@Request() request: HttpRequest, gameId: string): Promise<void> {
    const game = await gameRepository.get(gameId);

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, 'Only the creator of the game can delete the game!');
    }

    if (game.inProgress && game.gameTurnRangeKey > 1) {
      throw new HttpResponseError(400, `Can't delete an in progress game!`);
    }

    await deleteGame(game, request.user);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/edit')
  public async edit(@Request() request: HttpRequest, gameId: string, @Body() body: GameRequestBody): Promise<Game> {
    const game = await gameRepository.get(gameId);

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, `You didn't create this game!`);
    }

    if (game.slots < game.players.length) {
      throw new HttpResponseError(400, `You can't change the number of slots to less than the current number of players!`);
    }

    if (game.humans < game.players.length) {
      throw new HttpResponseError(400, `You can't change the number of humans to less than the current number of players!`);
    }

    if (!game.inProgress) {
      game.displayName = body.displayName;
      game.description = body.description;
      game.slots = body.slots;
      game.dlc = body.dlc;
      game.humans = body.humans;
      game.gameSpeed = body.gameSpeed;
      game.mapFile = body.mapFile;
      game.mapSize = body.mapSize;
    }

    game.allowJoinAfterStart = body.allowJoinAfterStart;

    if (body.password) {
      if (body.password !== game.hashedPassword) {
        const salt = await bcrypt.genSalt(10);
        game.hashedPassword = await bcrypt.hash(body.password, salt);
      }
    } else {
      game.hashedPassword = null;
    }

    return gameRepository.saveVersioned(game);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/join')
  public async join(@Request() request: HttpRequest, gameId: string, @Body() body: JoinGameRequestBody): Promise<Game> {
    const game = await gameRepository.get(gameId);
    let targetPlayer: GamePlayer;

    if (game.inProgress) {
      if (!game.allowJoinAfterStart) {
        throw new HttpResponseError(400, 'Game does not allow joining after start!');
      }

      targetPlayer = _.find(game.players, player => {
        return player.civType === body.playerCiv;
      });

      if (!targetPlayer) {
        throw new HttpResponseError(400, 'Requested civ not found.');
      }

      if (targetPlayer.steamId) {
        throw new HttpResponseError(400, 'Slot already assigned.');
      }
    } else {
      if (body.playerCiv !== 'LEADER_RANDOM' && _.map(game.players, 'civType').indexOf(body.playerCiv) >= 0) {
        throw new HttpResponseError(400, 'Civ already in Game');
      }
    }

    if (_.map(game.players, 'steamId').indexOf(request.user) >= 0) {
      throw new HttpResponseError(400, 'Player already in Game');
    }

    if (getHumans(game).length >= game.humans) {
      throw new HttpResponseError(400, 'Too many humans already in game.');
    }

    if (game.hashedPassword) {
      if (!(await bcrypt.compare(body.password || '', game.hashedPassword))) {
        throw new HttpResponseError(400, 'Supplied password does not match game password!');
      }
    }

    if (targetPlayer) {
      targetPlayer.steamId = request.user;
    } else {
      game.players.push({
        steamId: request.user,
        civType: body.playerCiv
      });
    }

    const user = await userRepository.get(request.user);

    if (!user.emailAddress) {
      throw new HttpResponseError(404, 'You need to set an email address for notifications before joining a game.');
    }

    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds.push(game.gameId);

    await Promise.all([
      gameRepository.saveVersioned(game),
      userRepository.saveVersioned(user)
    ]);

    const users = await userRepository.getUsersForGame(game);

    const createdByUser = _.find(users, u => {
      return u.steamId === game.createdBySteamId;
    });

    const promises = [];

    if (createdByUser.emailAddress) {
      const email = {
        Destination: {
          ToAddresses: [
            createdByUser.emailAddress
          ]
        },
        Message: {
          Body: {
            Html: {
              Data: `<p>The user <b>${user.displayName}</b> has joined your game <b>${game.displayName}</b>!  ` +
                `There are now <b>${getHumans(game, true).length} / ${game.humans}</b> ` +
                `human player slots filled in the game.</p>`
            }
          }, Subject: {
            Data: 'A new user has joined your game!'
          }
        },
        Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
      };

      promises.push(ses.sendEmail(email).promise());
    }

    if (game.inProgress) {
      promises.push(gameTurnRepository.getAndUpdateSaveFileForGameState(game, users));
    }

    await Promise.all(promises);

    return game;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/leave')
  public async leave(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await gameRepository.get(gameId);

    if (game.createdBySteamId === request.user) {
      throw new HttpResponseError(400, `You can't leave, you created the game!`);
    }

    if (game.inProgress && game.gameTurnRangeKey > 1) {
      throw new HttpResponseError(400, 'You can only leave a game before it starts.');
    }

    if (_.map(game.players, 'steamId').indexOf(request.user) < 0) {
      throw new HttpResponseError(400, 'Player not in Game');
    }

    _.remove(game.players, player => {
      return player.steamId === request.user;
    });

    const user = await userRepository.get(request.user);

    _.pull(user.activeGameIds, game.gameId);

    await Promise.all([
      gameRepository.saveVersioned(game),
      userRepository.saveVersioned(user)
    ]);

    const createdByUser = await userRepository.get(game.createdBySteamId);

    if (createdByUser.emailAddress) {
      const email = {
        Destination: {
          ToAddresses: [
            createdByUser.emailAddress
          ]
        },
        Message: {
          Body: {
            Html: {
              Data: `<p>The user <b>${user.displayName}</b> has left your game <b>${game.displayName}</b>.  ` +
                `There are now <b>${game.players.length} / ${game.humans}</b> human players in the game.</p>`
            }
          }, Subject: {
            Data: 'A user has left your game.'
          }
        },
        Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
      };

      await ses.sendEmail(email).promise();
    }

    return game;
  }

  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('listOpen')
  public async listOpen(@Request() request: HttpRequest): Promise<OpenGamesResponse> {
    const test = gameRepository;
    if (test.batchGet) {
      test.batchGet(['wat']);
    }
    const games: Game[] = await gameRepository.scan('completed').not().eq(true).exec();
    const orderedGames = _.orderBy(games, ['createdAt'], ['desc']);

    return {
      notStarted: _.filter(orderedGames, game => {
        return !game.inProgress;
      }),
      openSlots: _.filter(orderedGames, game => {
        const numHumans = _.filter(game.players, player => {
          return !!player.steamId;
        }).length;

        return game.inProgress &&
          game.allowJoinAfterStart &&
          !game.completed &&
          numHumans < game.players.length &&
          numHumans < game.humans;
      })
    };
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/start')
  public async start(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await gameRepository.get(gameId);

    if (game.inProgress) {
      throw new HttpResponseError(400, 'Game in progress!');
    }

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, 'You didn\'t create this game!');
    }

    if (game.players.length < 2) {
      throw new HttpResponseError(400, 'Not enough players to start the game!');
    }

    game.inProgress = true;
    await gameRepository.saveVersioned(game);

    const firstTurn: GameTurn = {
      gameId: game.gameId,
      turn: 1,
      round: 1,
      playerSteamId: game.createdBySteamId
    };

    await gameTurnRepository.saveVersioned(firstTurn);

    return game;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/surrender')
  public async surrender(@Request() request: HttpRequest, gameId: string, @Body() body: SurrenderBody): Promise<Game> {
    const game = await gameRepository.get(gameId);
    let userId = request.user;

    if (body.kickUserId) {
      if (game.createdBySteamId !== request.user) {
        throw new HttpResponseError(400, 'You must be the game creator to kick a user!');
      }

      const diffTime = new Date().getTime() - game.updatedAt.getTime();

      if (diffTime < 1000 * 60 * 60 * 24) {
        throw new HttpResponseError(404, `You cannot kick a user if they haven't had 24 hours to play their turn.`);
      }

      userId = body.kickUserId;
    }

    const player = _.find(game.players, p => {
      return p.steamId === userId;
    });

    if (!player) {
      throw new HttpResponseError(404, 'Player not in Game.');
    }

    if (player.hasSurrendered) {
      throw new HttpResponseError(404, 'Player has already surrendered!');
    }

    if (game.gameTurnRangeKey <= 1) {
      throw new HttpResponseError(404, `You can't surrender yet!  Create the game!`);
    }

    player.hasSurrendered = true;

    // The game is completed if every player is AI
    game.completed = _.every(game.players, p => {
      return !playerIsHuman(p);
    });

    const users = await userRepository.getUsersForGame(game);
    const user = _.find(users, u => {
      return u.steamId === userId;
    });

    _.pull(user.activeGameIds, gameId);

    user.inactiveGameIds = user.inactiveGameIds || [];
    user.inactiveGameIds.push(gameId);

    const gameTurn = await gameTurnRepository.get({ gameId: gameId, turn: game.gameTurnRangeKey });

    if (user.steamId === game.currentPlayerSteamId) {
      // Update the current player if it's the turn of the player who's surrendering
      const curIndex = getCurrentPlayerIndex(game);
      const nextIndex = getNextPlayerIndex(game);

      if (nextIndex >= 0) {
        game.currentPlayerSteamId = gameTurn.playerSteamId = game.players[nextIndex].steamId;

        if (nextIndex <= curIndex) {
          game.round = gameTurn.round++;
        }
      }

      gameTurn.startDate = new Date();

      await gameTurnRepository.getAndUpdateSaveFileForGameState(game);
    }

    await Promise.all([
      userRepository.saveVersioned(user),
      gameRepository.saveVersioned(game),
      gameTurnRepository.saveVersioned(gameTurn)
    ]);

    // Send an sns message that a turn has been completed.
    await sendSnsMessage(Config.resourcePrefix() + 'turn-submitted', 'turn-submitted', game.gameId);

    // Send an email to everyone else left in the game....
    const emailPromises = [];

    for (const gamePlayer of game.players) {
      const curUser = _.find(users, u => {
        return u.steamId === gamePlayer.steamId;
      });

      if (curUser && curUser.emailAddress) {
        let desc = 'surrendered';

        if (body.kickUserId) {
          desc = 'been kicked';
        }

        if (playerIsHuman(gamePlayer)) {
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

        if (gamePlayer.steamId === body.kickUserId) {
          const email = {
            Destination: {
              ToAddresses: [
                curUser.emailAddress
              ]
            },
            Message: {
              Body: {
                Html: {
                  Data: `<p>You have been kicked from <b>${game.displayName}</b>. If you feel this was unwarranted, ` +
                    `please contact mike@playyourdamnturn.com and we can try to mediate the situation.</p>`
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

    await Promise.all(emailPromises);

    return game;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('{gameId}/turn')
  public async getTurn(@Request() request: HttpRequest, gameId: string): Promise<GameTurnResponse> {
    const game = await gameRepository.get(gameId);

    if (game.currentPlayerSteamId !== request.user) {
      throw new HttpResponseError(400, `It's not your turn!`);
    }

    const file = gameTurnRepository.createS3SaveKey(gameId, game.gameTurnRangeKey);

    const fileParams = {
      Bucket: Config.resourcePrefix() + 'saves',
      Key: file
    };

    if (request.query && request.query.compressed) {
      fileParams.Key += '.gz';

      try {
        await s3.headObject(fileParams).promise();
      } catch (err) {
        fileParams.Key = file;
      }
    }

    return {
      downloadUrl: s3.getSignedUrl('getObject', _.merge(fileParams, {
        ResponseContentDisposition: `attachment; filename='(PYDT) Play This One!.Civ6Save'`,
        Expires: 60
      }))
    };
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/finishSubmit')
  public async finishSubmit(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await gameRepository.get(gameId);

    if (game.currentPlayerSteamId !== request.user) {
      throw new HttpResponseError(400, `It's not your turn!`);
    }

    const gameTurn = await gameTurnRepository.get({ gameId: game.gameId, turn: game.gameTurnRangeKey });
    game.gameTurnRangeKey++;

    const users = await userRepository.getUsersForGame(game);
    const user = _.find(users, u => {
      return u.steamId === request.user;
    });

    const data = await s3.getObject({
      Bucket: Config.resourcePrefix() + 'saves',
      Key: gameTurnRepository.createS3SaveKey(gameId, game.gameTurnRangeKey)
    }).promise();

    if (!data && !data.Body) {
      throw new Error('File doesn\'t exist?');
    }

    let buffer = data.Body;

    // Attempt to gunzip...
    try {
      buffer = zlib.unzipSync(data.Body as any);
      pydtLogger.info('unzip succeeded!');
    } catch (e) {
      // If unzip fails, assume raw save file was uploaded...
      pydtLogger.info('unzip failed :(', e);
    }

    const wrapper = gameTurnRepository.parseSaveFile(buffer, game);
    const parsed = wrapper.parsed;

    const numCivs = parsed.CIVS.length;
    const parsedRound = parsed.GAME_TURN.data;
    const gameDlc = game.dlc || [];
    const parsedDlc = [];

    if (parsed.MOD_BLOCK_1) {
      for (const mod of parsed.MOD_BLOCK_1.data) {
        // Official DLC starts with a localization string, assuming non-official doesn't?
        const modTitle = mod.MOD_TITLE.data;

        // Ignore scenarios so we don't have to open that can of worms...
        if (modTitle.indexOf(`{"LOC_`) === 0 && modTitle.indexOf('_SCENARIO_') < 0) {
          parsedDlc.push(mod.MOD_ID.data);
        }
      }
    }

    if (gameDlc.length !== parsedDlc.length || _.difference(gameDlc, parsedDlc).length) {
      throw new HttpResponseError(400, `DLC mismatch!  Please ensure that you have the correct DLC enabled (or disabled)!`);
    }

    if (numCivs !== game.slots) {
      throw new HttpResponseError(400, `Invalid number of civs in save file! (actual: ${numCivs}, expected: ${game.slots})`);
    }

    if (game.gameSpeed && game.gameSpeed !== parsed.GAME_SPEED.data) {
      throw new HttpResponseError(
        400,
        `Invalid game speed in save file!  (actual: ${parsed.GAME_SPEED.data}, expected: ${game.gameSpeed})`
      );
    }

    if (game.mapFile && parsed.MAP_FILE.data.indexOf(game.mapFile) < 0) {
      throw new HttpResponseError(400, `Invalid map file in save file! (actual: ${parsed.MAP_FILE.data}, expected: ${game.mapFile})`);
    }

    if (game.mapSize && game.mapSize !== parsed.MAP_SIZE.data) {
      throw new HttpResponseError(400, `Invalid map size in save file! (actual: ${parsed.MAP_SIZE.data}, expected: ${game.mapSize})`);
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
          throw new HttpResponseError(400, `Incorrect civ type in save file! (actual: ${actualCiv}, expected: ${expectedCiv})`);
        }

        if (playerIsHuman(game.players[i])) {
          if (parsedCiv.ACTOR_AI_HUMAN === 1) {
            throw new HttpResponseError(400, `Expected civ ${i} to be human!`);
          }

          if (parsedCiv.PLAYER_ALIVE && !parsedCiv.PLAYER_ALIVE.data) {
            // Player has been defeated!
            game.players[i].hasSurrendered = true;
            newDefeatedPlayers.push(game.players[i]);
          }
        } else {
          if (parsedCiv.ACTOR_AI_HUMAN === 3) {
            throw new HttpResponseError(400, `Expected civ ${i} to be AI!`);
          }
        }
      } else {
        if (parsedCiv.ACTOR_AI_HUMAN === 3) {
          throw new HttpResponseError(400, `Expected civ ${i} to be AI!`);
        }

        game.players[i] = {
          civType: parsedCiv.LEADER_NAME.data
        } as GamePlayer;
      }
    }

    let expectedRound = gameTurn.round;

    if (gameTurn.turn === 1) {
      // When starting a game, take whatever round is in the file.  This allows starting in different eras.
      expectedRound = parsedRound;
    }

    const nextPlayerIndex = getNextPlayerIndex(game);

    if (nextPlayerIndex <= getCurrentPlayerIndex(game)) {
      expectedRound++;
    }

    if (expectedRound !== parsedRound) {
      throw new HttpResponseError(400, `Incorrect game turn in save file! (actual: ${parsedRound}, expected: ${expectedRound})`);
    }

    const isCurrentTurn = parsed.CIVS[nextPlayerIndex].IS_CURRENT_TURN;

    if (!isCurrentTurn || !isCurrentTurn.data) {
      throw new HttpResponseError(400, 'Incorrect player turn in save file!');
    }

    game.currentPlayerSteamId = game.players[getNextPlayerIndex(game)].steamId;
    game.round = expectedRound;

    await gameTurnRepository.updateSaveFileForGameState(game, users, wrapper);
    await moveToNextTurn(game, gameTurn, user);

    if (newDefeatedPlayers.length) {
      await defeatPlayers(game, users, newDefeatedPlayers);
    }

    return game;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/revert')
  public async revert(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await gameRepository.get(gameId);

    if (game.currentPlayerSteamId !== request.user && game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, `You can't revert this game!`);
    }

    const turn = game.gameTurnRangeKey - 1;
    let lastTurn: GameTurn;

    do {
      const curGameTurn = await gameTurnRepository.get({gameId: game.gameId, turn: turn});

      const player = _.find(game.players, p => {
        return p.steamId === curGameTurn.playerSteamId;
      });

      if (playerIsHuman(player)) {
        lastTurn = curGameTurn;
      }
    } while (!lastTurn);

    const user = await userRepository.get(lastTurn.playerSteamId);
    gameTurnRepository.updateTurnStatistics(game, lastTurn, user, true);

    // Update previous turn data
    delete lastTurn.skipped;
    delete lastTurn.endDate;
    lastTurn.startDate = new Date();

    const promises = [];

    // Delete turns between the old turn and the turn to revert to
    for (let i = lastTurn.turn + 1; i <= game.gameTurnRangeKey; i++) {
      pydtLogger.info(`deleting ${gameId}/${i}`);
      promises.push(gameTurnRepository.delete({gameId: gameId, turn: i}));
    }

    // Update game record
    const curPlayerIndex = getCurrentPlayerIndex(game);
    const prevPlayerIndex = getPreviousPlayerIndex(game);

    if (prevPlayerIndex >= curPlayerIndex) {
      game.round--;
    }

    game.currentPlayerSteamId = game.players[prevPlayerIndex].steamId;
    game.gameTurnRangeKey = lastTurn.turn;

    promises.push(gameTurnRepository.saveVersioned(lastTurn));
    promises.push(gameRepository.saveVersioned(game));
    promises.push(userRepository.saveVersioned(user));
    promises.push(gameTurnRepository.getAndUpdateSaveFileForGameState(game));

    await Promise.all(promises);

    // Send an sns message that a turn has been completed.
    await sendSnsMessage(Config.resourcePrefix() + 'turn-submitted', 'turn-submitted', game.gameId);

    return game;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/startSubmit')
  public async startSubmit(@Request() request: HttpRequest, gameId: string): Promise<StartTurnSubmitResponse> {
    const game = await gameRepository.get(gameId);
    if (game.currentPlayerSteamId !== request.user) {
      throw new HttpResponseError(400, 'It\'s not your turn!');
    }

    return {
      putUrl: s3.getSignedUrl('putObject', {
        Bucket: Config.resourcePrefix() + 'saves',
        Key: gameTurnRepository.createS3SaveKey(gameId, game.gameTurnRangeKey + 1),
        Expires: 60,
        ContentType: 'application/octet-stream'
      })
    };
  }

  @Get('{gameId}')
  public get(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    return gameRepository.get(gameId);
  }
}

export interface ChangeCivRequestBody {
  playerCiv: string;
}

export interface SurrenderBody {
  kickUserId?: string;
}

export interface GameRequestBody extends BaseGame {
  password?: string;
}

export interface CreateGameRequestBody extends GameRequestBody {
  player1Civ: string;
}

export interface JoinGameRequestBody extends ChangeCivRequestBody {
  password?: string;
}

export interface OpenGamesResponse {
  notStarted: Game[];
  openSlots: Game[];
}

export interface GameTurnResponse {
  downloadUrl: string;
}

export interface StartTurnSubmitResponse {
  putUrl: string;
}
