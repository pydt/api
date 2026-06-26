import 'reflect-metadata';
import { expect } from 'chai';
import * as fs from 'fs';
import { describe, it } from 'mocha';
import { Civ7SaveHandler } from './civ7SaveHandler';
import { ActorType } from './saveHandler';

describe('Civ7SaveHandler', () => {
  it('should parse correctly', () => {
    const buffer = fs.readFileSync('testdata/saves/civ7/MachiavelliAnt1.Civ7Save');
    const handler = new Civ7SaveHandler(buffer);

    expect(handler.gameTurn).to.eq(1);
    expect(handler.gameSpeed).to.eq('GAMESPEED_ONLINE');
    expect(handler.mapSize).to.eq('MAPSIZE_STANDARD');

    expect(handler.civData.length).to.eq(8);

    const humans = handler.civData.filter(c => c.type === ActorType.HUMAN).map(c => c.leaderName);
    expect(humans).to.deep.equal([
      'LEADER_BENJAMIN_FRANKLIN',
      'LEADER_MACHIAVELLI',
      'LEADER_NAPOLEON_ALT'
    ]);
  });

  it("reads whose turn it is from the PYDT companion mod's stamped property", () => {
    const buffer = fs.readFileSync('testdata/saves/civ7/MachiavelliAnt1.Civ7Save');
    const handler = new Civ7SaveHandler(buffer);

    // The mod stamped player=1 (Napoleon) as the active player
    const current = handler.civData.filter(c => c.isCurrentTurn);
    expect(current.length).to.eq(1);
    expect(current[0].leaderName).to.eq('LEADER_MACHIAVELLI');
    expect(current[0].type).to.eq(ActorType.HUMAN);
  });

  it('surfaces enabled mods via parsedDlcs', () => {
    const buffer = fs.readFileSync('testdata/saves/civ7/MachiavelliAnt1.Civ7Save');
    const handler = new Civ7SaveHandler(buffer);

    expect(handler.parsedDlcs).to.include('napoleon');
    expect(handler.parsedDlcs).to.include('ada-lovelace');
    expect(handler.parsedDlcs).to.include('genghis-khan');
    expect(handler.parsedDlcs).to.include('edward-teach');
  });

  it('can flip a human player to AI (turn skipping) and round-trip', () => {
    let handler = new Civ7SaveHandler(
      fs.readFileSync('testdata/saves/civ7/MachiavelliAnt1.Civ7Save')
    );

    const napoleon = () => handler.civData.find(c => c.leaderName === 'LEADER_NAPOLEON_ALT');
    expect(napoleon().type).to.eq(ActorType.HUMAN);

    napoleon().type = ActorType.AI;

    // re-parse the written buffer to confirm it persisted
    handler = new Civ7SaveHandler(handler.getData());
    expect(napoleon().type).to.eq(ActorType.AI);
    // other players are untouched (Machiavelli still human)
    expect(handler.civData.find(c => c.leaderName === 'LEADER_MACHIAVELLI').type).to.eq(
      ActorType.HUMAN
    );
  });
});
