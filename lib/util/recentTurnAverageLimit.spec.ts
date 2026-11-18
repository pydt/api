import 'reflect-metadata';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { HttpResponseError } from '../../api/framework';
import { Game } from '../models';
import { GameUtil } from './gameUtil';

const HOUR = 60 * 60 * 1000;
const game = (maxRecentTurnAverageMinutes?: number) => ({ maxRecentTurnAverageMinutes }) as Game;

describe('GameUtil.recentTurnAverageJoinError', () => {
  it('lets anyone join a game without a limit', () => {
    expect(
      GameUtil.recentTurnAverageJoinError(game(), {
        recentTurnAverage: 99 * HOUR,
        recentTurnCount: 100
      })
    ).to.eq(null);
  });

  it('lets players at or under the limit join', () => {
    expect(
      GameUtil.recentTurnAverageJoinError(game(600), {
        recentTurnAverage: 10 * HOUR,
        recentTurnCount: 100
      })
    ).to.eq(null);
  });

  it('blocks players over the limit, saying what their average is', () => {
    expect(
      GameUtil.recentTurnAverageJoinError(game(600), {
        recentTurnAverage: 14 * HOUR + 20 * 60 * 1000,
        recentTurnCount: 100
      })
    ).to.eq(
      'This game only allows players whose average turn time over their last 100 turns is 10h or less. Yours is 14h 20m.'
    );
  });

  it("lets in players who don't have enough turns for a real average yet", () => {
    expect(GameUtil.recentTurnAverageJoinError(game(600), {})).to.eq(null);
    expect(
      GameUtil.recentTurnAverageJoinError(game(600), {
        recentTurnAverage: 99 * HOUR,
        recentTurnCount: 9
      })
    ).to.eq(null);
    expect(
      GameUtil.recentTurnAverageJoinError(game(600), {
        recentTurnAverage: 99 * HOUR,
        recentTurnCount: 10
      })
    ).to.be.a('string');
  });
});

describe('GameUtil.validateMaxRecentTurnAverage', () => {
  it('treats an empty value as no limit', () => {
    expect(GameUtil.validateMaxRecentTurnAverage(undefined)).to.eq(undefined);
    expect(GameUtil.validateMaxRecentTurnAverage(0)).to.eq(undefined);
  });

  it('accepts 6 to 24 hours', () => {
    expect(GameUtil.validateMaxRecentTurnAverage(360)).to.eq(360);
    expect(GameUtil.validateMaxRecentTurnAverage(1440)).to.eq(1440);
  });

  it('rejects anything outside that range', () => {
    for (const bad of [359, 1441, 600.5]) {
      expect(() => GameUtil.validateMaxRecentTurnAverage(bad)).to.throw(HttpResponseError);
    }
  });
});

describe('GameUtil.formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(GameUtil.formatDuration(10 * HOUR)).to.eq('10h');
    expect(GameUtil.formatDuration(14 * HOUR + 20 * 60 * 1000)).to.eq('14h 20m');
    expect(GameUtil.formatDuration(45 * 60 * 1000)).to.eq('45m');
    expect(GameUtil.formatDuration(10 * 1000)).to.eq('0m');
  });
});
