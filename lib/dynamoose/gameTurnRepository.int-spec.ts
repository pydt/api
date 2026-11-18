import 'reflect-metadata';
import { aws as dynamooseAws, Table } from 'dynamoose';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { v4 as uuid } from 'uuid';
import { Config } from '../config';
import { RECENT_TURN_COUNT, StatsUtil } from '../util/statsUtil';
import { GameTurnRepository } from './gameTurnRepository';

dynamooseAws.ddb.set(
  new dynamooseAws.ddb.DynamoDB({
    endpoint: 'http://localhost:8000',
    region: Config.region
  })
);

Table.defaults.set({
  create: true
});

describe('GameTurnRepository.getRecentTurnsForUser', () => {
  it('returns the newest turns from the player index and feeds recentTurnStats', async () => {
    const repo = new GameTurnRepository();
    const steamId = uuid();
    const otherSteamId = uuid();
    const gameId = uuid();
    const HOUR = 60 * 60 * 1000;

    // 3 older 10h turns, then RECENT_TURN_COUNT newer 1h turns, saved in order so updatedAt follows them,
    // plus another player's turn that mustn't show up
    for (let i = 0; i < 3 + RECENT_TURN_COUNT; i++) {
      const hours = i < 3 ? 10 : 1;

      await repo.saveVersioned({
        gameId,
        turn: i,
        round: i,
        playerSteamId: steamId,
        startDate: new Date(Date.UTC(2026, 0, 1) + i * 24 * HOUR),
        endDate: new Date(Date.UTC(2026, 0, 1) + i * 24 * HOUR + hours * HOUR)
      });
    }

    await repo.saveVersioned({ gameId, turn: 1000, round: 1000, playerSteamId: otherSteamId });

    const turns = await repo.getRecentTurnsForUser(steamId, RECENT_TURN_COUNT);

    expect(turns).to.have.length(RECENT_TURN_COUNT);
    expect(turns.every(t => t.playerSteamId === steamId)).to.equal(true);
    expect(turns[0].turn).to.equal(2 + RECENT_TURN_COUNT);

    expect(StatsUtil.recentTurnStats(turns)).to.deep.equal({
      recentTurnAverage: HOUR,
      recentTurnCount: RECENT_TURN_COUNT
    });
  });
});
