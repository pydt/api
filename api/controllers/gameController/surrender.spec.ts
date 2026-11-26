import 'reflect-metadata';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { It, Mock } from 'typemoq';
import { IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { IGameTurnRepository } from '../../../lib/dynamoose/gameTurnRepository';
import { IPrivateUserDataRepository } from '../../../lib/dynamoose/privateUserDataRepository';
import { IUserRepository } from '../../../lib/dynamoose/userRepository';
import { ISesProvider } from '../../../lib/email/sesProvider';
import { Game, GameTurn, User } from '../../../lib/models';
import { IGameTurnService } from '../../../lib/services/gameTurnService';
import { ISnsProvider } from '../../../lib/snsProvider';
import { HttpRequest } from '../../framework';
import { GameController_Surrender } from './surrender';

const ADMIN = 'admin';
const OLD = new Date('2026-01-01T00:00:00Z');

// The admin kicks `kicked` (more than 24 hours after the last turn) and we return what got saved
const runKick = async (kicked: string) => {
  const game = {
    gameId: 'g1',
    gameType: 'CIV6',
    createdBySteamId: ADMIN,
    inProgress: true,
    gameTurnRangeKey: 50,
    round: 10,
    currentPlayerSteamId: 'p2',
    lastTurnEndDate: OLD,
    turnTimerMinutes: 2880,
    players: [{ steamId: ADMIN }, { steamId: 'p2' }, { steamId: 'p3' }]
  } as Game;

  const turn = {
    gameId: 'g1',
    turn: 50,
    round: 10,
    playerSteamId: 'p2',
    startDate: OLD
  } as GameTurn;

  const users = Mock.ofType<IUserRepository>();
  users
    .setup(x => x.get(It.isAnyString()))
    .returns(id => Promise.resolve({ steamId: id, activeGameIds: ['g1'] } as User));
  users.setup(x => x.saveVersioned(It.isAny())).returns(u => Promise.resolve(u));

  const games = Mock.ofType<IGameRepository>();
  games.setup(x => x.getOrThrow404('g1')).returns(() => Promise.resolve(game));
  games.setup(x => x.saveVersioned(It.isAny())).returns(g => Promise.resolve(g));

  const turns = Mock.ofType<IGameTurnRepository>();
  turns.setup(x => x.get(It.isAny())).returns(() => Promise.resolve(turn));
  turns.setup(x => x.saveVersioned(It.isAny())).returns(t => Promise.resolve(t));

  const puds = Mock.ofType<IPrivateUserDataRepository>();
  puds.setup(x => x.getUserDataForGame(It.isAny())).returns(() => Promise.resolve([]));

  const controller = new GameController_Surrender(
    users.object,
    puds.object,
    games.object,
    turns.object,
    Mock.ofType<IGameTurnService>().object,
    Mock.ofType<ISesProvider>().object,
    Mock.ofType<ISnsProvider>().object
  );

  await controller.surrender({ user: ADMIN } as HttpRequest, 'g1', { kickUserId: kicked });

  return { game, turn };
};

describe('GameController_Surrender', () => {
  it('restarts the timer the website shows when the current player is kicked (#10612)', async () => {
    const before = Date.now();
    const { game, turn } = await runKick('p2');

    expect(game.currentPlayerSteamId).to.eq('p3');
    expect(turn.playerSteamId).to.eq('p3');
    expect(turn.startDate.getTime()).to.be.at.least(before);
    expect(game.lastTurnEndDate).to.deep.eq(turn.startDate);
  });

  it("leaves the timer alone when the kicked player wasn't up", async () => {
    const { game, turn } = await runKick('p3');

    expect(game.currentPlayerSteamId).to.eq('p2');
    expect(turn.startDate).to.deep.eq(OLD);
    expect(game.lastTurnEndDate).to.deep.eq(OLD);
  });
});
