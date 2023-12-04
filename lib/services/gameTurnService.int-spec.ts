import 'reflect-metadata';
import { aws as dynamooseAws, Table } from 'dynamoose';
import { describe, it } from 'mocha';
import { v4 as uuid } from 'uuid';
import { GameTurnService } from './gameTurnService';
import { GameRepository } from '../dynamoose/gameRepository';
import { CIV6_GAME } from '../metadata/civGames/civ6';
import { Game, GameTurn, User } from '../models';
import { Config } from '../config';
import { UserRepository } from '../dynamoose/userRepository';
import { expect } from 'chai';
import { cloneDeep } from 'lodash';
import { ONE_DAY, ONE_HOUR } from 'pydt-shared-models';

dynamooseAws.ddb.set(
  new dynamooseAws.ddb.DynamoDB({
    endpoint: 'http://localhost:8000',
    region: Config.region
  })
);

Table.defaults.set({
  create: true
});

describe('GameTurnService_updateTurnStatistics', () => {
  it('should calculate/serialize/deserialize correctly', async () => {
    const GAME_ID = uuid();
    const USER_1_ID = uuid();
    const USER_2_ID = uuid();

    const DEFAULT_HOUR_QUEUE =
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const DEFAULT_DAY_QUEUE =
      '111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111';

    let game = {
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
      ],
      hourOfDayQueue: DEFAULT_HOUR_QUEUE,
      dayOfWeekQueue: DEFAULT_DAY_QUEUE
    } as Game;

    const turn1: GameTurn = {
      gameId: GAME_ID,
      playerSteamId: USER_1_ID,
      round: 5,
      turn: 10,
      startDate: new Date(Date.UTC(2023, 10, 2, 4, 0, 0)),
      endDate: new Date(Date.UTC(2023, 10, 2, 9, 0, 0))
    };

    const turn2: GameTurn = {
      ...cloneDeep(turn1),
      startDate: new Date(Date.UTC(2023, 10, 2, 10, 0, 0)),
      endDate: new Date(Date.UTC(2023, 10, 2, 23, 0, 0))
    };

    const turn3: GameTurn = {
      ...cloneDeep(turn1),
      startDate: new Date(Date.UTC(2023, 10, 2, 23, 0, 0)),
      endDate: new Date(Date.UTC(2023, 10, 3, 23, 0, 0)),
      skipped: true
    };

    let user = {
      steamId: USER_1_ID,
      displayName: 'player 1'
    } as User;

    GameTurnService.updateTurnStatistics(game, turn1, user);

    const gameRepository = new GameRepository();
    const userRepository = new UserRepository();

    await gameRepository.saveVersioned(game);
    await userRepository.saveVersioned(user);

    game = await gameRepository.get(GAME_ID);
    user = await userRepository.get(USER_1_ID);

    for (const data of [game, user, game.players[0], user.statsByGameType[0]]) {
      expect(data.fastTurns).to.equal(0);
      expect(data.slowTurns).to.equal(0);
      expect(data.timeTaken).to.equal(ONE_HOUR * 5);
      expect(data.turnsPlayed).to.equal(1);
      expect(data.turnsSkipped).to.equal(0);

      if (data === game) {
        expect(data.dayOfWeekQueue).to.equal(DEFAULT_DAY_QUEUE + '4');
        expect(data.hourOfDayQueue).to.equal(DEFAULT_HOUR_QUEUE + 'J');
      } else {
        expect(data.dayOfWeekQueue).to.equal('4');
        expect(data.hourOfDayQueue).to.equal('J');
      }

      expect(data.turnLengthBuckets).to.deep.equal({
        [ONE_HOUR * 6]: 1
      });
      expect(data.yearBuckets).to.deep.equal({
        '2023': 1
      });
      expect(data.firstTurnEndDate).to.deep.equal(new Date('2023-11-02T09:00:00.000Z'));
      expect(data.lastTurnEndDate).to.deep.equal(new Date('2023-11-02T09:00:00.000Z'));
    }

    GameTurnService.updateTurnStatistics(game, turn2, user);

    await gameRepository.saveVersioned(game);
    await userRepository.saveVersioned(user);

    game = await gameRepository.get(GAME_ID);
    user = await userRepository.get(USER_1_ID);

    for (const data of [game, user, game.players[0], user.statsByGameType[0]]) {
      expect(data.fastTurns).to.equal(0);
      expect(data.slowTurns).to.equal(1);
      expect(data.timeTaken).to.equal(ONE_HOUR * 18);
      expect(data.turnsPlayed).to.equal(2);
      expect(data.turnsSkipped).to.equal(0);

      if (data === game) {
        expect(data.dayOfWeekQueue).to.equal(DEFAULT_DAY_QUEUE.substring(1) + '44');
        expect(data.hourOfDayQueue).to.equal(DEFAULT_HOUR_QUEUE.substring(1) + 'JX');
      } else {
        expect(data.dayOfWeekQueue).to.equal('44');
        expect(data.hourOfDayQueue).to.equal('JX');
      }

      expect(data.turnLengthBuckets).to.deep.equal({
        [ONE_HOUR * 6]: 1,
        [ONE_DAY]: 1
      });
      expect(data.yearBuckets).to.deep.equal({
        '2023': 2
      });
      expect(data.firstTurnEndDate).to.deep.equal(new Date('2023-11-02T09:00:00.000Z'));
      expect(data.lastTurnEndDate).to.deep.equal(new Date('2023-11-02T23:00:00.000Z'));
    }

    GameTurnService.updateTurnStatistics(game, turn3, user);

    await gameRepository.saveVersioned(game);
    await userRepository.saveVersioned(user);

    game = await gameRepository.get(GAME_ID);
    user = await userRepository.get(USER_1_ID);

    for (const data of [game, user, game.players[0], user.statsByGameType[0]]) {
      expect(data.fastTurns).to.equal(0);
      expect(data.slowTurns).to.equal(1);
      expect(data.timeTaken).to.equal(ONE_HOUR * 18);
      expect(data.turnsPlayed).to.equal(2);
      expect(data.turnsSkipped).to.equal(1);

      if (data === game) {
        expect(data.dayOfWeekQueue).to.equal(DEFAULT_DAY_QUEUE.substring(1) + '44');
        expect(data.hourOfDayQueue).to.equal(DEFAULT_HOUR_QUEUE.substring(1) + 'JX');
      } else {
        expect(data.dayOfWeekQueue).to.equal('44');
        expect(data.hourOfDayQueue).to.equal('JX');
      }

      expect(data.turnLengthBuckets).to.deep.equal({
        [ONE_HOUR * 6]: 1,
        [ONE_DAY]: 1
      });
      expect(data.yearBuckets).to.deep.equal({
        '2023': 2
      });
      expect(data.firstTurnEndDate).to.deep.equal(new Date('2023-11-02T09:00:00.000Z'));
      expect(data.lastTurnEndDate).to.deep.equal(new Date('2023-11-03T23:00:00.000Z'));
    }

    GameTurnService.updateTurnStatistics(game, turn3, user, true);

    await gameRepository.saveVersioned(game);
    await userRepository.saveVersioned(user);

    game = await gameRepository.get(GAME_ID);
    user = await userRepository.get(USER_1_ID);

    for (const data of [game, user, game.players[0], user.statsByGameType[0]]) {
      expect(data.fastTurns).to.equal(0);
      expect(data.slowTurns).to.equal(1);
      expect(data.timeTaken).to.equal(ONE_HOUR * 18);
      expect(data.turnsPlayed).to.equal(2);
      expect(data.turnsSkipped).to.equal(0);

      if (data === game) {
        expect(data.dayOfWeekQueue).to.equal(DEFAULT_DAY_QUEUE.substring(1) + '44');
        expect(data.hourOfDayQueue).to.equal(DEFAULT_HOUR_QUEUE.substring(1) + 'JX');
      } else {
        expect(data.dayOfWeekQueue).to.equal('44');
        expect(data.hourOfDayQueue).to.equal('JX');
      }

      expect(data.turnLengthBuckets).to.deep.equal({
        [ONE_HOUR * 6]: 1,
        [ONE_DAY]: 1
      });
      expect(data.yearBuckets).to.deep.equal({
        '2023': 2
      });
      expect(data.firstTurnEndDate).to.deep.equal(new Date('2023-11-02T09:00:00.000Z'));
      expect(data.lastTurnEndDate).to.deep.equal(new Date('2023-11-03T23:00:00.000Z'));
    }

    GameTurnService.updateTurnStatistics(game, turn2, user, true);

    await gameRepository.saveVersioned(game);
    await userRepository.saveVersioned(user);

    game = await gameRepository.get(GAME_ID);
    user = await userRepository.get(USER_1_ID);

    for (const data of [game, user, game.players[0], user.statsByGameType[0]]) {
      expect(data.fastTurns).to.equal(0);
      expect(data.slowTurns).to.equal(0);
      expect(data.timeTaken).to.equal(ONE_HOUR * 5);
      expect(data.turnsPlayed).to.equal(1);
      expect(data.turnsSkipped).to.equal(0);

      if (data === game) {
        expect(data.dayOfWeekQueue).to.equal(DEFAULT_DAY_QUEUE.substring(1) + '44');
        expect(data.hourOfDayQueue).to.equal(DEFAULT_HOUR_QUEUE.substring(1) + 'JX');
      } else {
        expect(data.dayOfWeekQueue).to.equal('44');
        expect(data.hourOfDayQueue).to.equal('JX');
      }

      expect(data.turnLengthBuckets).to.deep.equal({
        [ONE_HOUR * 6]: 1,
        [ONE_DAY]: 0
      });
      expect(data.yearBuckets).to.deep.equal({
        '2023': 1
      });
      expect(data.firstTurnEndDate).to.deep.equal(new Date('2023-11-02T09:00:00.000Z'));
      expect(data.lastTurnEndDate).to.deep.equal(new Date('2023-11-03T23:00:00.000Z'));
    }
  });
});
