import { expect } from 'chai';
import { describe, it } from 'mocha';
import { GamePlayer } from '../models';
import { GameUtil } from './gameUtil';

// Forum #11118: substitution requests on players who are out of the game
describe('GameUtil.markPlayerSurrendered', () => {
  it('takes the player out and clears their substitution request', () => {
    const player: GamePlayer = { steamId: '1', civType: 'X', substitutionRequested: true };

    GameUtil.markPlayerSurrendered(player);

    expect(player.hasSurrendered).to.eq(true);
    expect(player.surrenderDate).to.be.instanceOf(Date);
    expect(player.substitutionRequested).to.eq(false);
  });
});

describe('GameUtil.needsSubstitution', () => {
  const needs = (...players: GamePlayer[]) => GameUtil.needsSubstitution({ players });

  it('is true when an active player requested a substitute', () => {
    expect(
      needs(
        { steamId: '1', civType: 'X' },
        { steamId: '2', civType: 'Y', substitutionRequested: true }
      )
    ).to.eq(true);
  });

  it('is false when nobody requested one', () => {
    expect(needs({ steamId: '1', civType: 'X' }, { steamId: '2', civType: 'Y' })).to.eq(false);
  });

  it('ignores requests left on surrendered players', () => {
    expect(
      needs(
        { steamId: '1', civType: 'X' },
        { steamId: '2', civType: 'Y', substitutionRequested: true, hasSurrendered: true }
      )
    ).to.eq(false);
  });

  it('ignores requests left on dead players', () => {
    expect(
      needs(
        { steamId: '1', civType: 'X' },
        { steamId: '2', civType: 'Y', substitutionRequested: true, isDead: true }
      )
    ).to.eq(false);
  });

  it('ignores requests on empty slots', () => {
    expect(
      needs(
        { steamId: '1', civType: 'X' },
        { steamId: '', civType: 'Y', substitutionRequested: true }
      )
    ).to.eq(false);
  });
});
