import { difference } from 'lodash';
import { CIV6_GAME, GAMES, RANDOM_CIV } from 'pydt-shared-models';
import { Post, Request, Response, Route, Security, Tags } from 'tsoa';
import * as zlib from 'zlib';
import { Config } from '../../../lib/config';
import { GAME_TURN_REPOSITORY_SYMBOL, IGameTurnRepository } from '../../../lib/dynamoose/gameTurnRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { pydtLogger } from '../../../lib/logging';
import { Game, GamePlayer, getCurrentPlayerIndex, getNextPlayerIndex, playerIsHuman } from '../../../lib/models';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../../lib/s3Provider';
import { ActorType } from '../../../lib/saveHandlers/saveHandler';
import { GAME_SERVICE_SYMBOL, IGameService } from '../../../lib/services/gameService';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../../lib/services/gameTurnService';
import { IUserService, USER_SERVICE_SYMBOL } from '../../../lib/services/userService';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';

@Route('game')
@Tags('game')
@provideSingleton(GameController_FinishSubmit)
export class GameController_FinishSubmit {
  constructor(
    @inject(GAME_SERVICE_SYMBOL) private gameService: IGameService,
    @inject(USER_SERVICE_SYMBOL) private userService: IUserService,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService,
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider
  ) {
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/turn/finishSubmit')
  public async finishSubmit(@Request() request: HttpRequest, gameId: string): Promise<Game> {
    const game = await this.gameService.getGame(gameId);

    if (game.currentPlayerSteamId !== request.user) {
      throw new HttpResponseError(400, `It's not your turn!`);
    }

    const gameTurn = await this.gameTurnRepository.get({ gameId: game.gameId, turn: game.gameTurnRangeKey });
    game.gameTurnRangeKey++;

    const users = await this.userService.getUsersForGame(game);
    const user = users.find(u => {
      return u.steamId === request.user;
    });

    const data = await this.s3.getObject({
      Bucket: Config.resourcePrefix + 'saves',
      Key: this.gameTurnService.createS3SaveKey(gameId, game.gameTurnRangeKey)
    });

    if (!data || !data.Body) {
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
    const civGame = GAMES.find(x => x.id === game.gameType);

    if (gameDlc.length !== saveHandler.parsedDlcs.length || difference(gameDlc, saveHandler.parsedDlcs).length) {
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

    if (game.mapFile) {
      const map = civGame.maps.find(x => x.file === game.mapFile);

      if (map && map.regex) {
        if (!map.regex.test(saveHandler.mapFile)) {
          throw new HttpResponseError(400, `Invalid map file in save file! (actual: ${saveHandler.mapFile}, expected to match regex: ${map.regex})`);
        }
      } else if (saveHandler.mapFile.toLowerCase().indexOf(game.mapFile.toLowerCase()) < 0) {
        throw new HttpResponseError(400, `Invalid map file in save file! (actual: ${saveHandler.mapFile}, expected: ${game.mapFile})`);
      }
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
            // I'm not sure that we care about this, either, should be set properly in updateSaveFileForGameState
            // throw new HttpResponseError(400, `Expected civ ${i} to be AI/Dead!`);
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
      // Allow round to stay the same on the turn for civ 6 world congress...
      if (!(game.gameType === CIV6_GAME.id && parsedRound === gameTurn.round)) {
        expectedRound++;
      }
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
}