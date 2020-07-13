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
    userRepositoryMock.setup(x => x.getUsersForGame(It.isAny())).returns(() => Promise.resolve<User[]>([]));

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
            mapFile: '{4873eb62-8ccc-4574-b784-dda455e74e68}Maps/EarthMaps/EarthStandard_XP2.Civ6Map'
          } as SaveHandler)
      );

    const gcfs = new GameController_FinishSubmit(
      gameRepositoryMock.object,
      gameTurnRepositoryMock.object,
      userRepositoryMock.object,
      gameTurnServiceMock.object,
      s3Mock.object
    );

    const game = await gcfs.finishSubmit({ user: USER_ID } as HttpRequest, GAME_ID);
    expect(game.currentPlayerSteamId).to.eq('player2');
  });
});
