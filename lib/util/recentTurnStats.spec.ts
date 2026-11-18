import { expect } from 'chai';
import { describe, it } from 'mocha';
import { GameTurn } from '../models';
import { RECENT_TURN_COUNT, StatsUtil } from './statsUtil';

const HOUR = 60 * 60 * 1000;
const BASE = Date.UTC(2026, 0, 1);

// A finished turn of `hours`, ending `endHoursAfterBase` after BASE
const turn = (
  n: number,
  hours: number,
  endHoursAfterBase = n,
  extra: Partial<GameTurn> = {}
): GameTurn => ({
  gameId: 'g',
  turn: n,
  round: n,
  playerSteamId: 'p',
  startDate: new Date(BASE + (endHoursAfterBase - hours) * HOUR),
  endDate: new Date(BASE + endHoursAfterBase * HOUR),
  ...extra
});

describe('StatsUtil.recentTurnStats', () => {
  it('averages finished turns and ignores the one in progress', () => {
    const inProgress = { ...turn(4, 1), endDate: undefined };

    expect(
      StatsUtil.recentTurnStats([turn(1, 2), turn(2, 4), turn(3, 6), inProgress])
    ).to.deep.equal({
      recentTurnAverage: 4 * HOUR,
      recentTurnCount: 3
    });
  });

  it('counts skipped turns at their real length', () => {
    expect(
      StatsUtil.recentTurnStats([turn(1, 2), turn(2, 24, 30, { skipped: true })]).recentTurnAverage
    ).to.equal(13 * HOUR);
  });

  it(`only uses the newest ${RECENT_TURN_COUNT} by end date`, () => {
    // 50 old 10h turns, then 100 newer 1h turns; input order shouldn't matter
    const old = Array.from({ length: 50 }, (_, i) => turn(i, 10, i));
    const recent = Array.from({ length: RECENT_TURN_COUNT }, (_, i) => turn(100 + i, 1, 1000 + i));

    expect(StatsUtil.recentTurnStats([...recent, ...old])).to.deep.equal({
      recentTurnAverage: HOUR,
      recentTurnCount: RECENT_TURN_COUNT
    });
  });

  it("uses the changed turn over the index's stale copy", () => {
    const stale = { ...turn(2, 1), endDate: undefined };

    // Just closed: the index still shows it open
    expect(StatsUtil.recentTurnStats([turn(1, 2), stale], turn(2, 4)).recentTurnCount).to.equal(2);

    // Just reopened by a revert: the index still shows it finished
    expect(StatsUtil.recentTurnStats([turn(1, 2), turn(2, 4)], stale)).to.deep.equal({
      recentTurnAverage: 2 * HOUR,
      recentTurnCount: 1
    });
  });

  it('handles no turns', () => {
    expect(StatsUtil.recentTurnStats(undefined)).to.deep.equal({
      recentTurnAverage: undefined,
      recentTurnCount: 0
    });
  });
});

describe('StatsUtil.recentTurnQueryLimit', () => {
  it('leaves room for one turn in progress per active game', () => {
    expect(StatsUtil.recentTurnQueryLimit({ activeGameIds: ['a', 'b', 'c'] })).to.equal(
      RECENT_TURN_COUNT + 4
    );
    expect(StatsUtil.recentTurnQueryLimit({ activeGameIds: undefined })).to.equal(
      RECENT_TURN_COUNT + 1
    );
  });
});
