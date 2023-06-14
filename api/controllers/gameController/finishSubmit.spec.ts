import 'reflect-metadata';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { It, Mock } from 'typemoq';
import * as zlib from 'zlib';
import { IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { IGameTurnRepository } from '../../../lib/dynamoose/gameTurnRepository';
import { IUserRepository } from '../../../lib/dynamoose/userRepository';
import { CIV6_GAME } from '../../../lib/metadata/civGames/civ6';
import { Game, GameTurn, User } from '../../../lib/models';
import { GetObjectResult, IS3Provider } from '../../../lib/s3Provider';
import { SaveHandler } from '../../../lib/saveHandlers/saveHandler';
import { IGameTurnService } from '../../../lib/services/gameTurnService';
import { HttpRequest } from '../../framework';
import { GameController_FinishSubmit } from './finishSubmit';
import { IPrivateUserDataRepository } from '../../../lib/dynamoose/privateUserDataRepository';
import { ISnsProvider } from '../../../lib/snsProvider';

describe('GameController_FinishSubmit', () => {
  it('should be able to handle weird new EarthStandard map name', async () => {
    const GAME_ID = 'GAME_ID';
    const USER_ID = 'USER_ID';

    const gameRepositoryMock = Mock.ofType<IGameRepository>();
    gameRepositoryMock
      .setup(x => x.getOrThrow404(GAME_ID))
      .returns(x =>
        Promise.resolve({
          gameId: x,
          currentPlayerSteamId: USER_ID,
          mapFile: 'EarthStandard.Civ6Map',
          slots: 2,
          round: 5,
          gameType: CIV6_GAME.id,
          createdBySteamId: USER_ID,
          players: [{ steamId: USER_ID }, { steamId: 'player2' }]
        } as Game)
      );

    const gameTurnRepositoryMock = Mock.ofType<IGameTurnRepository>();
    gameTurnRepositoryMock
      .setup(x => x.get(It.isAny(), It.isAny()))
      .returns(() =>
        Promise.resolve<GameTurn>({
          round: 5
        } as GameTurn)
      );

    const userRepositoryMock = Mock.ofType<IUserRepository>();
    userRepositoryMock
      .setup(x => x.getUsersForGame(It.isAny()))
      .returns(() => Promise.resolve<User[]>([]));

    const s3Mock = Mock.ofType<IS3Provider>();
    s3Mock
      .setup(x => x.getObject(It.isAny()))
      .returns(() =>
        Promise.resolve<GetObjectResult>({
          Body: zlib.gzipSync('Hello world')
        } as GetObjectResult)
      );

    const gameTurnServiceMock = Mock.ofType<IGameTurnService>();
    gameTurnServiceMock
      .setup(x => x.parseSaveFile(It.isAny(), It.isAny()))
      .returns(
        () =>
          ({
            civData: [{ isCurrentTurn: false }, { isCurrentTurn: true }],
            gameTurn: 5,
            parsedDlcs: [],
            mapFile:
              '{4873eb62-8ccc-4574-b784-dda455e74e68}Maps/EarthMaps/EarthStandard_XP2.Civ6Map'
          } as SaveHandler)
      );

    const pudMock = Mock.ofType<IPrivateUserDataRepository>();
    pudMock
      .setup(x => x.get(It.isAny(), It.isAny()))
      .returns(() =>
        Promise.resolve({
          steamId: '1'
        })
      );

    const gcfs = new GameController_FinishSubmit(
      gameRepositoryMock.object,
      gameTurnRepositoryMock.object,
      userRepositoryMock.object,
      gameTurnServiceMock.object,
      s3Mock.object,
      pudMock.object,
      Mock.ofType<ISnsProvider>().object
    );

    const game = await gcfs.finishSubmit({ user: USER_ID } as HttpRequest, GAME_ID);
    expect(game.currentPlayerSteamId).to.eq('player2');
  });

  it('should return bad dlc info', async () => {
    const GAME_ID = 'GAME_ID';
    const USER_ID = 'USER_ID';

    const gameRepositoryMock = Mock.ofType<IGameRepository>();
    gameRepositoryMock
      .setup(x => x.getOrThrow404(GAME_ID))
      .returns(x =>
        Promise.resolve({
          gameId: x,
          currentPlayerSteamId: USER_ID,
          mapFile: 'EarthStandard.Civ6Map',
          slots: 2,
          round: 5,
          dlc: ['3809975F-263F-40A2-A747-8BFB171D821A', '2F6E858A-28EF-46B3-BEAC-B985E52E9BC1'],
          gameType: CIV6_GAME.id,
          createdBySteamId: USER_ID,
          players: [{ steamId: USER_ID }, { steamId: 'player2' }]
        } as Game)
      );

    const gameTurnRepositoryMock = Mock.ofType<IGameTurnRepository>();
    gameTurnRepositoryMock
      .setup(x => x.get(It.isAny(), It.isAny()))
      .returns(() =>
        Promise.resolve<GameTurn>({
          round: 5
        } as GameTurn)
      );

    const userRepositoryMock = Mock.ofType<IUserRepository>();
    userRepositoryMock
      .setup(x => x.getUsersForGame(It.isAny()))
      .returns(() => Promise.resolve<User[]>([]));

    const s3Mock = Mock.ofType<IS3Provider>();
    s3Mock
      .setup(x => x.getObject(It.isAny()))
      .returns(() =>
        Promise.resolve<GetObjectResult>({
          Body: zlib.gzipSync('Hello world')
        } as GetObjectResult)
      );

    const gameTurnServiceMock = Mock.ofType<IGameTurnService>();
    gameTurnServiceMock
      .setup(x => x.parseSaveFile(It.isAny(), It.isAny()))
      .returns(
        () =>
          ({
            civData: [{ isCurrentTurn: false }, { isCurrentTurn: true }],
            gameTurn: 5,
            parsedDlcs: [
              '02A8BDDE-67EA-4D38-9540-26E685E3156E',
              '2F6E858A-28EF-46B3-BEAC-B985E52E9BC1'
            ],
            mapFile:
              '{4873eb62-8ccc-4574-b784-dda455e74e68}Maps/EarthMaps/EarthStandard_XP2.Civ6Map'
          } as SaveHandler)
      );

    const gcfs = new GameController_FinishSubmit(
      gameRepositoryMock.object,
      gameTurnRepositoryMock.object,
      userRepositoryMock.object,
      gameTurnServiceMock.object,
      s3Mock.object,
      Mock.ofType<IPrivateUserDataRepository>().object,
      Mock.ofType<ISnsProvider>().object
    );

    try {
      await gcfs.finishSubmit({ user: USER_ID } as HttpRequest, GAME_ID);
      expect(false).to.be.true;
    } catch (e) {
      expect(e.message).to
        .eq(`DLC mismatch!  Please ensure that you have the correct DLC enabled (or disabled)!
Enabled but not in save: Poland Civilization & Scenario Pack
In save but not enabled: Aztec Civilization Pack`);
    }
  });
});
