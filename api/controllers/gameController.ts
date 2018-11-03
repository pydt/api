import * as bcrypt from 'bcryptjs';
import * as _ from 'lodash';
import { RANDOM_CIV } from 'pydt-shared';
import { Body, Get, Post, Query, Request, Response, Route, Security, Tags } from 'tsoa';
import * as uuid from 'uuid/v4';
import * as zlib from 'zlib';
import { Config } from '../../lib/config';
import { DISCOURSE_PROVIDER_SYMBOL, IDiscourseProvider } from '../../lib/discourseProvider';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import { GAME_TURN_REPOSITORY_SYMBOL, IGameTurnRepository } from '../../lib/dynamoose/gameTurnRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../lib/email/sesProvider';
import { inject, provideSingleton } from '../../lib/ioc';
import { pydtLogger } from '../../lib/logging';
import {
  BaseGame, Game, GamePlayer, GameTurn, getCurrentPlayerIndex, getHumans, getNextPlayerIndex, getPreviousPlayerIndex, playerIsHuman
} from '../../lib/models';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../lib/s3Provider';
import { ActorType } from '../../lib/saveHandlers/saveHandler';
import { GAME_SERVICE_SYMBOL, IGameService } from '../../lib/services/gameService';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../lib/services/gameTurnService';
import { IUserService, USER_SERVICE_SYMBOL } from '../../lib/services/userService';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../lib/snsProvider';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../framework';

@Route('game')
@Tags('game')
@provideSingleton(GameController)
export class GameController {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_SERVICE_SYMBOL) private gameService: IGameService,
    @inject(USER_SERVICE_SYMBOL) private userService: IUserService,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService,
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider,
    @inject(DISCOURSE_PROVIDER_SYMBOL) private discourse: IDiscourseProvider
  ) {
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/changeCiv')
  public async changeCiv(@Request() request: HttpRequest, gameId: string, @Body() body: ChangeCivRequestBody): Promise<Game> {
    const game = await this.getGame(gameId);

    if (game.inProgress) {
      throw new HttpResponseError(400, 'Game in Progress');
    }

    if (body.playerCiv !== RANDOM_CIV.leaderKey && _.map(game.players, 'civType').indexOf(body.playerCiv) >= 0) {
      throw new HttpResponseError(400, 'Civ already in Game');
    }

    if (game.randomOnly && body.playerCiv !== RANDOM_CIV.leaderKey) {
      throw new HttpResponseError(400, 'Only random civs allowed!');
    }

    const player = _.find(game.players, p => {
      return p.steamId === request.user;
    });

    if (!player) {
      throw new HttpResponseError(400, 'Player not in Game');
    }

    player.civType = body.playerCiv;

    return this.gameRepository.saveVersioned(game);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('create')
  public async create(@Request() request: HttpRequest, @Body() body: CreateGameRequestBody): Promise<Game> {
    const user = await this.userRepository.get(request.user);

    if (!user.emailAddress) {
      throw new HttpResponseError(400, 'You need to set a notification email address before you can create a game.');
    }

    const games = await this.gameService.getGamesForUser(user);
    const hasFormingGame = _.some(games, game => {
      return game.createdBySteamId === request.user && !game.inProgress;
    });

    if (hasFormingGame) {
      throw new HttpResponseError(
        400,
        `You cannot create a new game at the moment because you already have one game that hasn't been started yet!`
      );
    }

    if (body.randomOnly && body.player1Civ !== RANDOM_CIV.leaderKey) {
      throw new HttpResponseError(400, 'Hey, you made the rules, random civs only!');
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
      gameType: body.gameType,
      gameSpeed: body.gameSpeed,
      mapFile: body.mapFile,
      mapSize: body.mapSize,
      randomOnly: body.randomOnly
    };

    const topic = await this.discourse.addGameTopic(newGame);

    if (topic) {
      newGame.discourseTopicId = topic.topic_id;
    }

    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      newGame.hashedPassword = await bcrypt.hash(body.password, salt);
    }

    await this.gameRepository.saveVersioned(newGame);

    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds.push(newGame.gameId);
    await this.userRepository.saveVersioned(user);

    return newGame;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/delete')
  public async delete(@Request() request: HttpRequest, gameId: string): Promise<void> {
    const game = await this.getGame(gameId);

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, 'Only the creator of the game can delete the game!');
    }

    if (game.inProgress && game.gameTurnRangeKey > 1) {
      throw new HttpResponseError(400, `Can't delete an in progress game!`);
    }

    await this.gameService.deleteGame(game, request.user);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/updateTurnOrder')
  public async updateTurnOrder(@Request() request: HttpRequest, gameId: string, @Body() body: UpdateTurnOrderRequestBody): Promise<Game> {
    const game = await this.getGame(gameId);

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, `You didn't create this game!`);
    }

    if (!!game.inProgress) {
      throw new HttpResponseError(400, `Can't update turn order after game start!`);
    }

    if (game.players.length !== body.steamIds.length) {
      throw new HttpResponseError(400, `Wrong number of steamIds`);
    }

    if (game.createdBySteamId !== body.steamIds[0]) {
      throw new HttpResponseError(400, `The player that created the game must be the first player!`);
    }

    const newPlayers = _.compact(_.map(body.steamIds, steamId => {
      return _.find(game.players, p => p.steamId === steamId);
    }));

    if (newPlayers.length !== game.players.length) {
      throw new HttpResponseError(400, `Invalid steamIds`);
    }

    game.players = newPlayers;

    return this.gameRepository.saveVersioned(game);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/edit')
  public async edit(@Request() request: HttpRequest, gameId: string, @Body() body: GameRequestBody): Promise<Game> {
    const game = await this.getGame(gameId);

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, `You didn't create this game!`);
    }

    if (!game.inProgress) {
      if (body.slots < game.players.length) {
        throw new HttpResponseError(400, `You can't change the number of slots to less than the current number of players!`);
      }

      if (body.humans < game.players.length) {
        throw new HttpResponseError(400, `You can't change the number of humans to less than the current number of players!`);
      }

      game.displayName = body.displayName;
      game.description = body.description;
      game.slots = body.slots;
      game.dlc = body.dlc;
      game.humans = body.humans;
      game.gameSpeed = body.gameSpeed;
      game.mapFile = body.mapFile;
      game.mapSize = body.mapSize;
      game.randomOnly = body.randomOnly;

      if (game.randomOnly) {
        game.players.forEach(x => x.civType = RANDOM_CIV.leaderKey);
      }
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

    return this.gameRepository.saveVersioned(game);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/join')
  public async join(@Request() request: HttpRequest, gameId: string, @Body() body: JoinGameRequestBody): Promise<Game> {
    const game = await this.getGame(gameId);
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
      if (game.randomOnly && body.playerCiv !== RANDOM_CIV.leaderKey) {
        throw new HttpResponseError(400, 'You can only join this game as a random civ!');
      }

      if (body.playerCiv !== RANDOM_CIV.leaderKey && _.map(game.players, 'civType').indexOf(body.playerCiv) >= 0) {
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

    const user = await this.userRepository.get(request.user);

    if (!user.emailAddress) {
      throw new HttpResponseError(404, 'You need to set an email address for notifications before joining a game.');
    }

    user.activeGameIds = user.activeGameIds || [];
    user.activeGameIds.push(game.gameId);

    await Promise.all([
      this.gameRepository.saveVersioned(game),
      this.userRepository.saveVersioned(user)
    ]);

    const users = await this.userService.getUsersForGame(game);

    const createdByUser = _.find(users, u => {
      return u.steamId === game.createdBySteamId;
    });

    const promises = [];

    if (createdByUser.emailAddress) {
      promises.push(this.ses.sendEmail(
        'A new user has joined your game!',
        'A new user has joined your game!',
        `The user <b>${user.displayName}</b> has joined your game <b>${game.displayName}</b>!  ` +
        `There are now <b>${getHumans(game, true).length} / ${game.humans}</b> ` +
        `human player slots filled in the game.`,
        createdByUser.emailAddress
      ));
    }

    if (game.inProgress) {
      promises.push(this.gameTurnService.getAndUpdateSaveFileForGameState(game, users));
    }

    await Promise.all(promises);

    return game;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/leave')
  public async leave(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await this.getGame(gameId);

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

    const user = await this.userRepository.get(request.user);

    _.pull(user.activeGameIds, game.gameId);

    await Promise.all([
      this.gameRepository.saveVersioned(game),
      this.userRepository.saveVersioned(user)
    ]);

    const createdByUser = await this.userRepository.get(game.createdBySteamId);

    if (createdByUser.emailAddress) {
      await this.ses.sendEmail(
        'A user has left your game.',
        'A user has left your game.',
        `The user <b>${user.displayName}</b> has left your game <b>${game.displayName}</b>.  ` +
        `There are now <b>${game.players.length} / ${game.humans}</b> human players in the game.`,
        createdByUser.emailAddress
      );
    }

    return game;
  }

  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('listOpen')
  public async listOpen(@Request() request: HttpRequest): Promise<OpenGamesResponse> {
    const games: Game[] = await this.gameRepository.incompleteGames();
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
          !game.hashedPassword &&
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
    const game = await this.getGame(gameId);

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
    await this.gameRepository.saveVersioned(game);

    const firstTurn: GameTurn = {
      gameId: game.gameId,
      turn: 1,
      round: 1,
      playerSteamId: game.createdBySteamId
    };

    await this.gameTurnRepository.saveVersioned(firstTurn);

    return game;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/surrender')
  public async surrender(@Request() request: HttpRequest, gameId: string, @Body() body: SurrenderBody): Promise<Game> {
    const game = await this.getGame(gameId);
    let userId = request.user;

    if (body.kickUserId) {
      if (game.createdBySteamId !== request.user) {
        throw new HttpResponseError(400, 'You must be the game creator to kick a user!');
      }

      const lastTurnTime = (game.lastTurnEndDate || game.updatedAt).getTime();
      const diffTime = new Date().getTime() - lastTurnTime;

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
    player.surrenderDate = new Date();

    // The game is completed if every player is AI
    game.completed = _.every(game.players, p => {
      return !playerIsHuman(p);
    });

    const users = await this.userService.getUsersForGame(game);
    const user = _.find(users, u => {
      return u.steamId === userId;
    });

    _.pull(user.activeGameIds, gameId);

    user.inactiveGameIds = user.inactiveGameIds || [];
    user.inactiveGameIds.push(gameId);

    const gameTurn = await this.gameTurnRepository.get({ gameId: gameId, turn: game.gameTurnRangeKey });

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

      await this.gameTurnService.getAndUpdateSaveFileForGameState(game);
    }

    await Promise.all([
      this.userRepository.saveVersioned(user),
      this.gameRepository.saveVersioned(game),
      this.gameTurnRepository.saveVersioned(gameTurn)
    ]);

    await this.sns.turnSubmitted(game);

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
          emailPromises.push(this.ses.sendEmail(
            `A player has ${desc} from ${game.displayName}!`,
            `A player has ${desc} from ${game.displayName}!`,
            `<b>${user.displayName}</b> has ${desc} from <b>${game.displayName}</b>. :(`,
            curUser.emailAddress
          ));
        }

        if (gamePlayer.steamId === body.kickUserId) {
          emailPromises.push(this.ses.sendEmail(
            `You have been kicked from ${game.displayName}!`,
            `You have been kicked from ${game.displayName}!`,
            `You have been kicked from <b>${game.displayName}</b>. If you feel this was unwarranted, ` +
            `please contact mike@playyourdamnturn.com and we can try to mediate the situation.`,
            curUser.emailAddress
          ));
        }
      }
    }

    await Promise.all(emailPromises);

    return game;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('{gameId}/turn')
  public async getTurn(@Request() request: HttpRequest, gameId: string, @Query() compressed = ''): Promise<GameTurnResponse> {
    const game = await this.getGame(gameId);

    if (game.currentPlayerSteamId !== request.user) {
      throw new HttpResponseError(400, `It's not your turn!`);
    }

    const file = this.gameTurnService.createS3SaveKey(gameId, game.gameTurnRangeKey);

    const fileParams = {
      Bucket: Config.resourcePrefix() + 'saves',
      Key: file
    };

    if (compressed) {
      fileParams.Key += '.gz';

      try {
        await this.s3.headObject(fileParams);
      } catch (err) {
        fileParams.Key = file;
      }
    }

    return {
      downloadUrl: this.s3.signedGetUrl(fileParams, '(PYDT) Play This One!.Civ6Save', 60)
    };
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/finishSubmit')
  public async finishSubmit(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await this.getGame(gameId);

    if (game.currentPlayerSteamId !== request.user) {
      throw new HttpResponseError(400, `It's not your turn!`);
    }

    const gameTurn = await this.gameTurnRepository.get({ gameId: game.gameId, turn: game.gameTurnRangeKey });
    game.gameTurnRangeKey++;

    const users = await this.userService.getUsersForGame(game);
    const user = _.find(users, u => {
      return u.steamId === request.user;
    });

    const data = await this.s3.getObject({
      Bucket: Config.resourcePrefix() + 'saves',
      Key: this.gameTurnService.createS3SaveKey(gameId, game.gameTurnRangeKey)
    });

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

    const saveHandler = this.gameTurnService.parseSaveFile(buffer, game);

    const numCivs = saveHandler.civData.length;
    const parsedRound = saveHandler.gameTurn;
    const gameDlc = game.dlc || [];

    if (gameDlc.length !== saveHandler.parsedDlcs.length || _.difference(gameDlc, saveHandler.parsedDlcs).length) {
      throw new HttpResponseError(400, `DLC mismatch!  Please ensure that you have the correct DLC enabled (or disabled)!`);
    }

    if (numCivs !== game.slots) {
      throw new HttpResponseError(400, `Invalid number of civs in save file! (actual: ${numCivs}, expected: ${game.slots})`);
    }

    if (game.gameSpeed && game.gameSpeed !== saveHandler.gameSpeed) {
      throw new HttpResponseError(
        400,
        `Invalid game speed in save file!  (actual: ${saveHandler.gameSpeed}, expected: ${game.gameSpeed})`
      );
    }

    if (game.mapFile && saveHandler.mapFile.indexOf(game.mapFile) < 0) {
      throw new HttpResponseError(400, `Invalid map file in save file! (actual: ${saveHandler.mapFile}, expected: ${game.mapFile})`);
    }

    if (game.mapSize && game.mapSize !== saveHandler.mapSize) {
      throw new HttpResponseError(400, `Invalid map size in save file! (actual: ${saveHandler.mapSize}, expected: ${game.mapSize})`);
    }

    const newDefeatedPlayers = [];

    for (let i = 0; i < saveHandler.civData.length; i++) {
      const civ = saveHandler.civData[i];

      if (game.players[i]) {
        const actualCiv = civ.leaderName;
        const expectedCiv = game.players[i].civType;

        if (expectedCiv === RANDOM_CIV.leaderKey) {
          game.players[i].civType = actualCiv;
        } else if (actualCiv !== expectedCiv) {
          throw new HttpResponseError(400, `Incorrect civ type in save file! (actual: ${actualCiv}, expected: ${expectedCiv})`);
        }

        if (playerIsHuman(game.players[i])) {
          if (civ.type === ActorType.DEAD) {
            // Player has been defeated!
            game.players[i].hasSurrendered = true;
            game.players[i].surrenderDate = new Date();
            newDefeatedPlayers.push(game.players[i]);
          } else if (civ.type === ActorType.AI) {
            // This is OK, type will be reset in updateSaveFileForGameState, and may be wrong
            // because of skipped turns!
            // throw new HttpResponseError(400, `Expected civ ${i} to be human!`);
          }
        } else {
          if (civ.type === ActorType.HUMAN) {
            throw new HttpResponseError(400, `Expected civ ${i} to be AI/Dead!`);
          }
        }
      } else {
        if (civ.type === ActorType.HUMAN) {
          throw new HttpResponseError(400, `Expected civ ${i} to be AI/Dead!`);
        }

        game.players[i] = {
          civType: civ.leaderName
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

    if (!saveHandler.civData[nextPlayerIndex].isCurrentTurn) {
      throw new HttpResponseError(
        400,
        `Incorrect player turn in save file!  This probably means it is still your turn and you have some more moves to make!`
      );
    }

    if (expectedRound !== parsedRound) {
      throw new HttpResponseError(400, `Incorrect game turn in save file! (actual: ${parsedRound}, expected: ${expectedRound})`);
    }

    game.currentPlayerSteamId = game.players[getNextPlayerIndex(game)].steamId;
    game.round = expectedRound;

    await this.gameTurnService.updateSaveFileForGameState(game, users, saveHandler);
    await this.gameTurnService.moveToNextTurn(game, gameTurn, user);

    if (newDefeatedPlayers.length) {
      await this.gameTurnService.defeatPlayers(game, users, newDefeatedPlayers);
    }

    return game;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/revert')
  public async revert(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await this.getGame(gameId);

    if (game.currentPlayerSteamId !== request.user && game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, `You can't revert this game!`);
    }

    const turn = game.gameTurnRangeKey - 1;
    let lastTurn: GameTurn;

    do {
      const curGameTurn = await this.gameTurnRepository.get({gameId: game.gameId, turn: turn});

      const player = _.find(game.players, p => {
        return p.steamId === curGameTurn.playerSteamId;
      });

      if (playerIsHuman(player)) {
        lastTurn = curGameTurn;
      }
    } while (!lastTurn);

    const user = await this.userRepository.get(lastTurn.playerSteamId);
    this.gameTurnService.updateTurnStatistics(game, lastTurn, user, true);

    // Update previous turn data
    delete lastTurn.skipped;
    delete lastTurn.endDate;
    lastTurn.startDate = new Date();

    const promises = [];

    // Delete turns between the old turn and the turn to revert to
    for (let i = lastTurn.turn + 1; i <= game.gameTurnRangeKey; i++) {
      pydtLogger.info(`deleting ${gameId}/${i}`);
      promises.push(this.gameTurnRepository.delete({gameId: gameId, turn: i}));
    }

    // Update game record
    const curPlayerIndex = getCurrentPlayerIndex(game);
    const prevPlayerIndex = getPreviousPlayerIndex(game);

    if (prevPlayerIndex >= curPlayerIndex) {
      game.round--;
    }

    game.currentPlayerSteamId = game.players[prevPlayerIndex].steamId;
    game.gameTurnRangeKey = lastTurn.turn;

    promises.push(this.gameTurnRepository.saveVersioned(lastTurn));
    promises.push(this.gameRepository.saveVersioned(game));
    promises.push(this.userRepository.saveVersioned(user));
    promises.push(this.gameTurnService.getAndUpdateSaveFileForGameState(game));

    await Promise.all(promises);

    await this.sns.turnSubmitted(game);

    return game;
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/startSubmit')
  public async startSubmit(@Request() request: HttpRequest, gameId: string): Promise<StartTurnSubmitResponse> {
    const game = await this.getGame(gameId);
    if (game.currentPlayerSteamId !== request.user) {
      throw new HttpResponseError(400, 'It\'s not your turn!');
    }

    return {
      putUrl: this.s3.signedPutUrl({
        Bucket: Config.resourcePrefix() + 'saves',
        Key: this.gameTurnService.createS3SaveKey(gameId, game.gameTurnRangeKey + 1)
      }, 'application/octet-stream', 60)
    };
  }

  @Get('{gameId}')
  public get(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    return this.gameRepository.get(gameId);
  }

  private async getGame(gameId: string) {
    const game = await this.gameRepository.get(gameId);

    if (!game) {
      throw new HttpResponseError(404, 'Not Found');
    }

    return game;
  }

  @Get('{gameId}/turns/{startTurn}/{endTurn}')
  public async getTurns(@Request() request: HttpRequest, gameId: string, startTurn: number, endTurn: number): Promise<GameTurn[]> {
    if (startTurn > endTurn) {
      throw new HttpResponseError(400, 'Start turn less than end turn');
    }

    if (endTurn - startTurn > 100) {
      throw new HttpResponseError(400, 'Too many turns requested');
    }

    return this.gameTurnRepository.getTurnsForGame(gameId, startTurn, endTurn);
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

export interface UpdateTurnOrderRequestBody {
  steamIds: string[];
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
