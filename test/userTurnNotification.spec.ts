import { expect } from 'chai';
import { describe, it } from 'mocha';
import { CIV6_GAME } from 'pydt-shared-models';
import * as sinon from 'sinon';
import { UserTurnNotification } from '../functions/sns/userTurnNotification';
import { IGameRepository } from '../lib/dynamoose/gameRepository';
import { IUserRepository } from '../lib/dynamoose/userRepository';
import { ISesProvider } from '../lib/email/sesProvider';
import { IHttpRequestProvider } from '../lib/httpRequestProvider';
import { IIotProvider } from '../lib/iotProvider';
import { Game } from '../lib/models/game';
import { User } from '../lib/models/user';

describe('UserTurnNotification', () => {

  const createMocks = (gameWebook?, userWebhook?, userEmail?) => {
    const gameRepo = {
      get: (gameId) => {
        return Promise.resolve({
          inProgress: true,
          currentPlayerSteamId: '1',
          gameType: CIV6_GAME.id,
          displayName: 'Test Game',
          round: 10,
          webhookUrl: gameWebook,
          players: [{
            steamId: '1',
            civType: 'LEADER_ALEXANDER'
          },{
            steamId: '2',
            civType: 'LEADER_AMANITORE'
          },{
            steamId: '3',
            civType: 'LEADER_CATHERINE_DE_MEDICI'
          }]
        } as Game);
      }
    } as IGameRepository;

    const userRepo = {
      get: (userId) => {
        return Promise.resolve({
          displayName: 'Test User',
          steamId: '1',
          webhookUrl: userWebhook,
          emailAddress: userEmail
        } as User)
      }
    } as IUserRepository;

    const requestSpy = sinon.spy();
    const http = {
      request: requestSpy
    } as IHttpRequestProvider;

    const iotSpy = sinon.spy();
    const iot = {
      notifyUserClient: iotSpy
    } as IIotProvider;

    const emailSpy = sinon.spy();
    const ses = {
      sendEmail: emailSpy
    } as ISesProvider;

    return {
      utn: new UserTurnNotification(gameRepo, userRepo, iot, ses, http),
      requestSpy,
      iotSpy,
      emailSpy
    };
  };

  it('should send notifications correctly on new turn', async () => {
    const mocks = createMocks('http://gamehook.com', 'http://userhook.com', 'wat@whoa.com');
    await mocks.utn.execute({
      gameId: '1',
      newTurn: true
    });

    const expectedRequestBody = {
      gameName: 'Test Game',
      userName: 'Test User',
      round: 10,
      content: `It's Test User's turn in Test Game (Round 10)`,
      civName: 'Macedon',
      leaderName: 'Alexander',
      // Duplicate "play by cloud" format
      value1: 'Test Game',
      value2: 'Test User',
      value3: 10
    };

    expect(mocks.requestSpy.calledTwice).to.be.true;
    expect(mocks.requestSpy.firstCall.args[0]).to.deep.include({
      uri: 'http://gamehook.com',
      body: expectedRequestBody
    });
    expect(mocks.requestSpy.secondCall.args[0]).to.deep.include({
      uri: 'http://userhook.com',
      body: expectedRequestBody
    });

    expect(mocks.iotSpy.calledOnce).to.be.true;
    expect(mocks.emailSpy.calledOnce).to.be.true;
  });

  it('should not try to call webhooks or send enails when not present on new turn', async () => {
    const mocks = createMocks();
    await mocks.utn.execute({
      gameId: '1',
      newTurn: true
    });

    expect(mocks.requestSpy.notCalled).to.be.true;
    expect(mocks.iotSpy.calledOnce).to.be.true;
    expect(mocks.emailSpy.notCalled).to.be.true;
  });

  it('should send iot notify to all users when not in new turn mode', async () => {
    const mocks = createMocks();
    await mocks.utn.execute({
      gameId: '1',
      newTurn: false
    });

    expect(mocks.requestSpy.notCalled).to.be.true;
    expect(mocks.iotSpy.calledThrice).to.be.true;
    expect(mocks.emailSpy.notCalled).to.be.true;
  });
});