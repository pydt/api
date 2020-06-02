import 'reflect-metadata';
import { describe, it } from 'mocha';
import { GameController_FinishSubmit } from './finishSubmit';
import { HttpRequest } from '../../framework';
import { IGameService } from '../../../lib/services/gameService';
import { Mock, It } from 'typemoq';
import { Game, User, GameTurn } from '../../../lib/models';
import { IGameTurnService } from '../../../lib/services/gameTurnService';
import { SaveHandler } from '../../../lib/saveHandlers/saveHandler';
import { IGameTurnRepository } from '../../../lib/dynamoose/gameTurnRepository';
import { IUserService } from '../../../lib/services/userService';
import { IS3Provider, GetObjectResult } from '../../../lib/s3Provider';
import * as zlib from 'zlib';
import { CIV6_GAME } from 'pydt-shared-models';
import { expect } from 'chai';


describe('GameController_FinishSubmit', () => {
  it('should be able to handle weird new EarthStandard map name', async () => {
    const GAME_ID = 'GAME_ID';
    const USER_ID = 'USER_ID';

    const gameServiceMock = Mock.ofType<IGameService>();
    gameServiceMock.setup(x => x.getGame(GAME_ID)).returns(x => Promise.resolve({
      gameId: x,
      currentPlayerSteamId: USER_ID,
      mapFile: 'EarthStandard.Civ6Map',
      slots: 2,
      round: 5,
      gameType: CIV6_GAME.id,
      createdBySteamId: USER_ID,
      players: [
        { steamId: USER_ID },
        { steamId: 'player2'}
      ]
    } as Game));

    const gameTurnRepositoryMock = Mock.ofType<IGameTurnRepository>();
    gameTurnRepositoryMock.setup(x => x.get(It.isAny(), It.isAny())).returns(() => Promise.resolve<GameTurn>({
      round: 5
    }as GameTurn));

    const userServiceMock = Mock.ofType<IUserService>();
    userServiceMock.setup(x => x.getUsersForGame(It.isAny())).returns(() => Promise.resolve<User[]>([]));

    const s3Mock = Mock.ofType<IS3Provider>();
    s3Mock.setup(x => x.getObject(It.isAny())).returns(() => Promise.resolve<GetObjectResult>({
      Body: zlib.gzipSync('Hello world')
    } as GetObjectResult));

    const gameTurnServiceMock = Mock.ofType<IGameTurnService>();
    gameTurnServiceMock.setup(x => x.parseSaveFile(It.isAny(), It.isAny())).returns(() => ({
      civData: [
        { isCurrentTurn: false },
        { isCurrentTurn: true }
      ],
      gameTurn: 5,
      parsedDlcs: [],
      mapFile: '{4873eb62-8ccc-4574-b784-dda455e74e68}Maps/EarthMaps/EarthStandard_XP2.Civ6Map'
    } as SaveHandler));

    var gcfs = new GameController_FinishSubmit(gameServiceMock.object, userServiceMock.object, gameTurnRepositoryMock.object, gameTurnServiceMock.object, s3Mock.object);
    
    const game = await gcfs.finishSubmit({ user: USER_ID } as HttpRequest, GAME_ID);
    expect(game.currentPlayerSteamId).to.eq('player2');
  });
});