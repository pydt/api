import 'reflect-metadata';
import { describe, it } from 'mocha';
import { UserTurnNotification } from './userTurnNotification';
import { IGameRepository } from '../../lib/dynamoose/gameRepository';
import { IUserRepository } from '../../lib/dynamoose/userRepository';
import { ISesProvider } from '../../lib/email/sesProvider';
import { IHttpRequestProvider } from '../../lib/httpRequestProvider';
import { IIotProvider } from '../../lib/iotProvider';
import { Game } from '../../lib/models/game';
import { User } from '../../lib/models/user';
import { Mock, It, Times, ExpectedCallType } from 'typemoq';
import { IPrivateUserDataRepository } from '../../lib/dynamoose/privateUserDataRepository';
import { PrivateUserData } from '../../lib/models';
import { IWebsocketProvider } from '../../lib/websocketProvider';
import { CIV6_GAME } from '../../lib/metadata/civGames/civ6';
import { IWebPushProvider } from '../../lib/webPushProvider';

describe('UserTurnNotification', () => {
  const createMocks = (gameWebook?, userWebhook?, userEmail?) => {
    const gameRepositoryMock = Mock.ofType<IGameRepository>();
    gameRepositoryMock
      .setup(x => x.get(It.isAny(), It.isAny()))
      .returns(() =>
        Promise.resolve({
          inProgress: true,
          currentPlayerSteamId: '1',
          gameType: CIV6_GAME.id,
          displayName: 'Test Game',
          round: 10,
          webhookUrl: gameWebook,
          players: [
            {
              steamId: '1',
              civType: 'LEADER_ALEXANDER'
            },
            {
              steamId: '2',
              civType: 'LEADER_AMANITORE'
            },
            {
              steamId: '3',
              civType: 'LEADER_CATHERINE_DE_MEDICI'
            }
          ]
        } as Game)
      );

    const userRepositoryMock = Mock.ofType<IUserRepository>();
    userRepositoryMock
      .setup(x => x.get(It.isAny(), It.isAny()))
      .returns(() =>
        Promise.resolve({
          displayName: 'Test User',
          steamId: '1'
        } as User)
      );

    const pudRepositoryMock = Mock.ofType<IPrivateUserDataRepository>();
    pudRepositoryMock
      .setup(x => x.get(It.isAny(), It.isAny()))
      .returns(() =>
        Promise.resolve({
          webhookUrl: userWebhook,
          emailAddress: userEmail,
          newTurnEmails: true
        } as PrivateUserData)
      );

    const iotMock = Mock.ofType<IIotProvider>();
    const emailMock = Mock.ofType<ISesProvider>();
    const httpRequestMock = Mock.ofType<IHttpRequestProvider>();
    const websocketMock = Mock.ofType<IWebsocketProvider>();
    const webPushMock = Mock.ofType<IWebPushProvider>();

    return {
      utn: new UserTurnNotification(
        gameRepositoryMock.object,
        userRepositoryMock.object,
        pudRepositoryMock.object,
        iotMock.object,
        emailMock.object,
        httpRequestMock.object,
        websocketMock.object,
        webPushMock.object
      ),
      iotMock,
      emailMock,
      httpRequestMock,
      websocketMock
    };
  };

  it('should send notifications correctly on new turn', async () => {
    const mocks = createMocks('http://gamehook.com', 'http://userhook.com', 'wat@whoa.com');

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

    mocks.httpRequestMock
      .setup(x =>
        x.request(
          It.isObjectWith({
            uri: 'http://gamehook.com',
            body: expectedRequestBody
          })
        )
      )
      .verifiable(Times.once(), ExpectedCallType.InSequence);

    mocks.httpRequestMock
      .setup(x =>
        x.request(
          It.isObjectWith({
            uri: 'http://userhook.com',
            body: expectedRequestBody
          })
        )
      )
      .verifiable(Times.once(), ExpectedCallType.InSequence);

    await mocks.utn.execute({
      gameId: '1',
      newTurn: true
    });

    mocks.httpRequestMock.verify(x => x.request(It.isAny()), Times.exactly(2));
    mocks.httpRequestMock.verifyAll();
    mocks.iotMock.verify(x => x.notifyUserClient(It.isAny()), Times.once());
    mocks.websocketMock.verify(x => x.sendMessage(It.isAny(), It.isAny()), Times.once());
    mocks.emailMock.verify(x => x.sendEmail(It.isAny(), It.isAny(), It.isAny(), It.isAny()), Times.once());
  });

  it('should not try to call webhooks or send emails when not present on new turn', async () => {
    const mocks = createMocks();
    await mocks.utn.execute({
      gameId: '1',
      newTurn: true
    });

    mocks.httpRequestMock.verify(x => x.request(It.isAny()), Times.never());
    mocks.iotMock.verify(x => x.notifyUserClient(It.isAny()), Times.once());
    mocks.websocketMock.verify(x => x.sendMessage(It.isAny(), It.isAny()), Times.once());
    mocks.emailMock.verify(x => x.sendEmail(It.isAny(), It.isAny(), It.isAny(), It.isAny()), Times.never());
  });

  it('should send iot notify to all users when not in new turn mode', async () => {
    const mocks = createMocks();
    await mocks.utn.execute({
      gameId: '1',
      newTurn: false
    });

    mocks.httpRequestMock.verify(x => x.request(It.isAny()), Times.never());
    mocks.iotMock.verify(x => x.notifyUserClient(It.isAny()), Times.exactly(3));
    mocks.websocketMock.verify(
      x =>
        x.sendMessage(
          It.is(x => x.length === 3),
          It.isAny()
        ),
      Times.once()
    );
    mocks.emailMock.verify(x => x.sendEmail(It.isAny(), It.isAny(), It.isAny(), It.isAny()), Times.never());
  });
});
