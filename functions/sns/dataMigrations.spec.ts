import 'reflect-metadata';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { It, Mock, Times } from 'typemoq';
import { IGameRepository } from '../../lib/dynamoose/gameRepository';
import { IGameTurnRepository } from '../../lib/dynamoose/gameTurnRepository';
import { IUserRepository } from '../../lib/dynamoose/userRepository';
import { CIV6_GAME } from '../../lib/metadata/civGames/civ6';
import { CIV7_GAME } from '../../lib/metadata/civGames/civ7';
import { Game } from '../../lib/models';
import { DataMigrations } from './dataMigrations';

describe('DataMigrations', () => {
  it('upgrades civ7 games saved with only a single representative dlc id per release', async () => {
    const civ7Game = {
      gameId: 'CIV7_GAME',
      gameType: CIV7_GAME.id,
      // Old-style: only the group's representative id was recorded.
      dlc: ['napoleon']
    } as Game;

    const civ6Game = {
      gameId: 'CIV6_GAME',
      gameType: CIV6_GAME.id,
      dlc: ['some-civ6-dlc']
    } as Game;

    const gameRepositoryMock = Mock.ofType<IGameRepository>();
    gameRepositoryMock
      .setup(x => x.allGames())
      .returns(() => Promise.resolve([civ7Game, civ6Game]));
    gameRepositoryMock
      .setup(x => x.saveVersioned(It.isAny()))
      .returns(game => Promise.resolve(game as Game));

    const dataMigrations = new DataMigrations(
      gameRepositoryMock.object,
      Mock.ofType<IGameTurnRepository>().object,
      Mock.ofType<IUserRepository>().object
    );

    await dataMigrations.execute('civ7dlcgroups:all');

    expect(civ7Game.dlc).to.have.members([
      'napoleon',
      'napoleon-alt',
      'shawnee-tecumseh',
      'friedrich-xerxes-alt',
      'ashoka-himiko-alt'
    ]);
    expect(civ7Game.dataVersion).to.eq(3);

    // Non-civ7 games are filtered out and never touched.
    expect(civ6Game.dlc).to.deep.equal(['some-civ6-dlc']);
    gameRepositoryMock.verify(x => x.saveVersioned(It.isAny()), Times.once());
  });

  it('is a no-op for civ7 games already at dataVersion 3', async () => {
    const civ7Game = {
      gameId: 'CIV7_GAME',
      gameType: CIV7_GAME.id,
      dataVersion: 3,
      dlc: ['napoleon']
    } as Game;

    const gameRepositoryMock = Mock.ofType<IGameRepository>();
    gameRepositoryMock.setup(x => x.allGames()).returns(() => Promise.resolve([civ7Game]));

    const dataMigrations = new DataMigrations(
      gameRepositoryMock.object,
      Mock.ofType<IGameTurnRepository>().object,
      Mock.ofType<IUserRepository>().object
    );

    await dataMigrations.execute('civ7dlcgroups:all');

    expect(civ7Game.dlc).to.deep.equal(['napoleon']);
    gameRepositoryMock.verify(x => x.saveVersioned(It.isAny()), Times.never());
  });
});
