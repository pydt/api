import 'reflect-metadata';
import * as dynamoose from 'dynamoose';

dynamoose.aws.sdk.config.update({
  region: 'us-east-1'
});
dynamoose.aws.ddb.local();

import { describe, it } from 'mocha';
import { It, Mock, Times } from 'typemoq';
import { v4 as uuid } from 'uuid';
import * as zlib from 'zlib';
import { GameRepository } from '../../../lib/dynamoose/gameRepository';
import { GameTurnRepository } from '../../../lib/dynamoose/gameTurnRepository';
import { UserRepository } from '../../../lib/dynamoose/userRepository';
import { Game, GameTurn, User } from '../../../lib/models';
import { GetObjectResult, IS3Provider, FileParams } from '../../../lib/s3Provider';
import { SaveHandler, ActorType } from '../../../lib/saveHandlers/saveHandler';
import { GameTurnService } from '../../../lib/services/gameTurnService';
import { HttpRequest } from '../../framework';
import { GameController_FinishSubmit } from './finishSubmit';
import { PrivateUserDataRepository } from '../../../lib/dynamoose/privateUserDataRepository';
import { ISnsProvider } from '../../../lib/snsProvider';
import { ISesProvider } from '../../../lib/email/sesProvider';
import { CIV6_GAME } from '../../../lib/metadata/civGames/civ6';

dynamoose.model.defaults.set({
  create: true
});

describe('GameController_FinishSubmit', () => {
  it('should send emails correctly when a player is defeated against real dynamodb', async () => {
    const GAME_ID = uuid();
    const USER_1_ID = uuid();
    const USER_2_ID = uuid();

    const gameRepository = new GameRepository();
    await gameRepository.saveVersioned({
      gameId: GAME_ID,
      displayName: 'test',
      currentPlayerSteamId: USER_1_ID,
      slots: 2,
      round: 5,
      gameTurnRangeKey: 10,
      gameType: CIV6_GAME.id,
      createdBySteamId: USER_1_ID,
      players: [
        { steamId: USER_1_ID, civType: 'one' },
        { steamId: USER_2_ID, civType: 'two' }
      ]
    } as Game);

    const gameTurnRepository = new GameTurnRepository();
    await gameTurnRepository.saveVersioned({
      gameId: GAME_ID,
      playerSteamId: USER_1_ID,
      round: 5,
      turn: 10
    } as GameTurn);

    const userRepository = new UserRepository();
    await userRepository.saveVersioned({
      steamId: USER_1_ID,
      displayName: 'player 1'
    } as User);
    await userRepository.saveVersioned({
      steamId: USER_2_ID,
      displayName: 'player 2'
    } as User);

    const pudRepository = new PrivateUserDataRepository();
    await pudRepository.saveVersioned({
      steamId: USER_1_ID,
      emailAddress: 'user1@email.com'
    });
    await pudRepository.saveVersioned({
      steamId: USER_2_ID,
      emailAddress: 'user2@email.com'
    });

    const s3Mock = Mock.ofType<IS3Provider>();
    s3Mock
      .setup(x => x.getObject(It.isAny()))
      .returns(() =>
        Promise.resolve<GetObjectResult>({
          Body: zlib.gzipSync('Hello world')
        } as GetObjectResult)
      );
    s3Mock
      .setup(x => x.putObject(It.isAny(), It.isAny(), It.isAny()))
      .returns(() => Promise.resolve());
    s3Mock.object.putObject({} as FileParams, 'asd', true);

    const sesMock = Mock.ofType<ISesProvider>();
    sesMock
      .setup(x => x.sendEmail(It.isAny(), It.isAny(), It.isAny(), 'user1@email.com'))
      .verifiable(Times.once());
    sesMock
      .setup(x => x.sendEmail(It.isAny(), It.isAny(), It.isAny(), 'user2@email.com'))
      .verifiable(Times.once());

    const gameTurnService = new GameTurnService(
      userRepository,
      pudRepository,
      gameRepository,
      gameTurnRepository,
      s3Mock.object,
      sesMock.object,
      Mock.ofType<ISnsProvider>().object
    );

    gameTurnService.parseSaveFile = () => {
      return {
        civData: [
          { isCurrentTurn: false, type: ActorType.DEAD, leaderName: 'one' },
          { isCurrentTurn: true, type: ActorType.HUMAN, leaderName: 'two' }
        ],
        getData: () => Buffer.of(1, 2, 3, 4),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        cleanupSave: (game: Game) => null,
        gameTurn: 5,
        parsedDlcs: []
      } as SaveHandler;
    };

    const gcfs = new GameController_FinishSubmit(
      gameRepository,
      gameTurnRepository,
      userRepository,
      gameTurnService,
      s3Mock.object,
      pudRepository
    );

    await gcfs.finishSubmit({ user: USER_1_ID } as HttpRequest, GAME_ID);
    sesMock.verifyAll();
  });
});
