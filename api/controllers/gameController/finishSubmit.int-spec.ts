import 'reflect-metadata';
import { expect } from 'chai';
import { aws as dynamooseAws, Table } from 'dynamoose';
import * as fs from 'fs';
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
import { CIV7_GAME } from '../../../lib/metadata/civGames/civ7';
import { Civ7SaveHandler } from '../../../lib/saveHandlers/civ7SaveHandler';
import { Config } from '../../../lib/config';
import { ISqsProvider } from '../../../lib/sqsProvider';
import { IDiscourseProvider } from '../../../lib/discourseProvider';

dynamooseAws.ddb.set(
  new dynamooseAws.ddb.DynamoDB({
    endpoint: 'http://localhost:8000',
    region: Config.region
  })
);

Table.defaults.set({
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
      discourseTopicId: 12345,
      players: [
        { steamId: USER_1_ID, civType: 'LEADER_ALEXANDER' },
        { steamId: USER_2_ID, civType: 'LEADER_GANDHI' }
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
      .setup(x =>
        x.sendEmail('You have been defeated in test!', It.isAny(), It.isAny(), 'user1@email.com')
      )
      .verifiable(Times.once());
    sesMock
      .setup(x =>
        x.sendEmail(
          'player 1 (Alexander - Macedon) has been defeated in test!',
          It.isAny(),
          It.isAny(),
          'user2@email.com'
        )
      )
      .verifiable(Times.once());

    const discourseMock = Mock.ofType<IDiscourseProvider>();
    discourseMock
      .setup(x => x.postToSmack(12345, 'player 1 (Alexander - Macedon) was defeated in round 5!'))
      .verifiable(Times.once());

    const gameTurnService = new GameTurnService(
      userRepository,
      pudRepository,
      gameRepository,
      gameTurnRepository,
      s3Mock.object,
      sesMock.object,
      Mock.ofType<ISnsProvider>().object,
      Mock.ofType<ISqsProvider>().object,
      discourseMock.object
    );

    gameTurnService.parseSaveFile = () => {
      return {
        civData: [
          { isCurrentTurn: false, type: ActorType.DEAD, leaderName: 'LEADER_ALEXANDER' },
          { isCurrentTurn: true, type: ActorType.HUMAN, leaderName: 'LEADER_GANDHI' }
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
      pudRepository,
      Mock.ofType<ISnsProvider>().object
    );

    await gcfs.finishSubmit({ user: USER_1_ID } as HttpRequest, GAME_ID);
    sesMock.verifyAll();
    discourseMock.verifyAll();
  });

  it('accepts the first save of a new Civ 7 age and keeps the round counting up', async () => {
    // KingsExp1 is the first curtain of the Exploration Age (turn 1, player 0 up).
    // It was saved by player 4, who ended the last turn of the Antiquity Age's
    // final round (70) and finished the age with the companion mod.
    const SAVE = fs.readFileSync('testdata/saves/civ7/KingsExp1.Civ7Save');
    const GAME_ID = uuid();
    const USER_IDS = [uuid(), uuid(), uuid(), uuid()];
    const [P0, P1, P3, P4] = USER_IDS;

    const gameRepository = new GameRepository();
    await gameRepository.saveVersioned({
      gameId: GAME_ID,
      displayName: 'civ 7 age transition',
      currentPlayerSteamId: P4,
      slots: 8,
      round: 70,
      gameTurnRangeKey: 280,
      gameType: CIV7_GAME.id,
      createdBySteamId: P0,
      inProgress: true,
      dlc: new Civ7SaveHandler(SAVE).parsedDlcs,
      players: [
        { steamId: P0, civType: 'LEADER_XERXES' },
        { steamId: P1, civType: 'LEADER_JOSE_RIZAL' },
        { civType: 'LEADER_IBN_BATTUTA', isDead: true },
        { steamId: P3, civType: 'LEADER_CHARLEMAGNE' },
        { steamId: P4, civType: 'LEADER_CONFUCIUS' },
        { civType: 'LEADER_NAPOLEON_ALT' },
        { civType: 'LEADER_FRIEDRICH', isDead: true },
        { civType: 'LEADER_SAYYIDA_AL_HURRA' }
      ]
    } as Game);

    const gameTurnRepository = new GameTurnRepository();
    await gameTurnRepository.saveVersioned({
      gameId: GAME_ID,
      playerSteamId: P4,
      round: 70,
      turn: 280
    } as GameTurn);

    const userRepository = new UserRepository();
    for (const [i, steamId] of USER_IDS.entries()) {
      await userRepository.saveVersioned({ steamId, displayName: `player ${i}` } as User);
    }

    const s3Mock = Mock.ofType<IS3Provider>();
    s3Mock
      .setup(x => x.getObject(It.isAny()))
      .returns(() =>
        Promise.resolve<GetObjectResult>({ Body: zlib.gzipSync(SAVE) } as GetObjectResult)
      );
    s3Mock
      .setup(x => x.putObject(It.isAny(), It.isAny(), It.isAny()))
      .returns(() => Promise.resolve());

    const pudRepository = new PrivateUserDataRepository();
    const gameTurnService = new GameTurnService(
      userRepository,
      pudRepository,
      gameRepository,
      gameTurnRepository,
      s3Mock.object,
      Mock.ofType<ISesProvider>().object,
      Mock.ofType<ISnsProvider>().object,
      Mock.ofType<ISqsProvider>().object,
      Mock.ofType<IDiscourseProvider>().object
    );

    const gcfs = new GameController_FinishSubmit(
      gameRepository,
      gameTurnRepository,
      userRepository,
      gameTurnService,
      pudRepository,
      Mock.ofType<ISnsProvider>().object
    );

    await gcfs.finishSubmit({ user: P4 } as HttpRequest, GAME_ID);

    // Read back from Dynamo, so saveHandlerData round-trips through its JSON column
    const game = await gameRepository.get(GAME_ID, true);
    expect(game.round).to.eq(71);
    expect(game.currentPlayerSteamId).to.eq(P0);
    expect(game.saveHandlerData).to.deep.eq({ v: 1, ageStartRounds: { AGE_EXPLORATION: 71 } });
    expect(game.players[0].civilization).to.eq('CIVILIZATION_ABBASID');

    const nextTurn = await gameTurnRepository.get({ gameId: GAME_ID, turn: 281 });
    expect(nextTurn.round).to.eq(71);
    expect(nextTurn.playerSteamId).to.eq(P0);
  });
});
