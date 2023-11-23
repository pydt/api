import 'reflect-metadata';
import * as fs from 'fs';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { GameTurnService } from './gameTurnService';
import { Game, GameTurn, User, PrivateUserData } from '../models';
import { IS3Provider } from '../s3Provider';
import { IGameTurnRepository } from '../dynamoose/gameTurnRepository';
import { IUserRepository } from '../dynamoose/userRepository';
import { IGameRepository } from '../dynamoose/gameRepository';
import { ISnsProvider } from '../snsProvider';
import { ISesProvider } from '../email/sesProvider';
import { Civ5SaveHandler } from '../saveHandlers/civ5SaveHandler';
import { ActorType } from '../saveHandlers/saveHandler';
import { Mock, It } from 'typemoq';
import { IPrivateUserDataRepository } from '../dynamoose/privateUserDataRepository';
import { ISqsProvider } from '../sqsProvider';

describe('GameTurnService', () => {
  it('should skip turn correctly', async () => {
    const turnTimerMinutes = 60;
    const turnStartDate = new Date(new Date().getTime() - (turnTimerMinutes + 1) * 60000);

    const game = <Game>{
      createdBySteamId: '1',
      currentPlayerSteamId: '4',
      displayName: 'Civ5 Test',
      gameId: 'testGame',
      gameTurnRangeKey: 20,
      gameType: 'CIV5',
      humans: 4,
      lastTurnEndDate: turnStartDate,
      players: [
        { steamId: '1', civType: 'LEADER_ALEXANDER' },
        { steamId: '2', civType: 'LEADER_HIAWATHA' },
        { steamId: '3', civType: 'LEADER_DARIUS' },
        { steamId: '4', civType: 'LEADER_AUGUSTUS' }
      ],
      round: 4,
      turnTimerMinutes
    };

    const turn: GameTurn = {
      gameId: 'testGame',
      playerSteamId: '4',
      round: 4,
      startDate: turnStartDate,
      turn: 20
    };

    const gameRepositoryMock = Mock.ofType<IGameRepository>();
    gameRepositoryMock.setup(x => x.saveVersioned(It.isAny())).returns(g => Promise.resolve(g));

    const gameTurnRepositoryMock = Mock.ofType<IGameTurnRepository>();
    gameTurnRepositoryMock.setup(x => x.saveVersioned(It.isAny())).returns(x => Promise.resolve(x));

    const userRepositoryMock = Mock.ofType<IUserRepository>();
    userRepositoryMock.setup(x => x.saveVersioned(It.isAny())).returns(u => Promise.resolve(u));
    userRepositoryMock
      .setup(x => x.getUsersForGame(It.isAny()))
      .returns(g =>
        Promise.resolve(
          g.players.map(x => ({ steamId: x.steamId, displayName: x.civType }) as User)
        )
      );

    const pudRepositoryMock = Mock.ofType<IPrivateUserDataRepository>();
    pudRepositoryMock
      .setup(x => x.get(It.isAny()))
      .returns(() => Promise.resolve({ emailAddress: 'email@address.com' } as PrivateUserData));

    let skippedData: Buffer;

    const s3ProviderMock = Mock.ofType<IS3Provider>();
    s3ProviderMock
      .setup(x => x.getObject(It.isAny()))
      .returns(fp => {
        expect(fp.Key.indexOf('/000020')).to.be.greaterThan(0);
        return Promise.resolve({ Body: fs.readFileSync('testdata/saves/civ5/000020.Civ5Save') });
      });
    s3ProviderMock
      .setup(x => x.putObject(It.isAny(), It.isAny(), It.isAny()))
      .callback((fp, data) => {
        if (!fp.Key.endsWith('.gz')) {
          skippedData = data;
        }
      });

    const sesProviderMock = Mock.ofType<ISesProvider>();
    sesProviderMock
      .setup(x => x.sendEmail(It.isAny(), It.isAny(), It.isAny(), It.isAny()))
      .returns(() => Promise.resolve());

    const snsProviderMock = Mock.ofType<ISnsProvider>();
    snsProviderMock.setup(x => x.turnSubmitted(It.isAny())).returns(() => Promise.resolve());

    const sqsProviderMock = Mock.ofType<ISqsProvider>();
    sqsProviderMock
      .setup(x => x.queueTurnForGlobalData(It.isAny()))
      .returns(() => Promise.resolve());

    const gts = new GameTurnService(
      userRepositoryMock.object,
      pudRepositoryMock.object,
      gameRepositoryMock.object,
      gameTurnRepositoryMock.object,
      s3ProviderMock.object,
      sesProviderMock.object,
      snsProviderMock.object,
      sqsProviderMock.object
    );
    await gts.skipTurn(game, turn);
    expect(skippedData).to.not.be.null;

    const handler = new Civ5SaveHandler(skippedData);
    expect(handler.civData[0].type).to.be.eq(ActorType.HUMAN);
    expect(handler.civData[0].isCurrentTurn).to.be.true;
    expect(handler.civData[0].password).to.be.empty;
    expect(handler.civData[0].playerName).to.be.eq(game.players[0].civType);
    expect(handler.civData[1].type).to.be.eq(ActorType.HUMAN);
    expect(handler.civData[1].isCurrentTurn).to.be.false;
    expect(handler.civData[1].password).to.not.be.empty;
    expect(handler.civData[1].playerName).to.be.eq(game.players[1].civType);
    expect(handler.civData[2].type).to.be.eq(ActorType.HUMAN);
    expect(handler.civData[2].isCurrentTurn).to.be.false;
    expect(handler.civData[2].password).to.not.be.empty;
    expect(handler.civData[2].playerName).to.be.eq(game.players[2].civType);
    expect(handler.civData[3].type).to.be.eq(ActorType.AI);
    expect(handler.civData[3].isCurrentTurn).to.be.false;
    expect(handler.civData[3].password).to.not.be.empty;
    expect(handler.civData[3].playerName).to.be.eq(game.players[3].civType);
  });
});
