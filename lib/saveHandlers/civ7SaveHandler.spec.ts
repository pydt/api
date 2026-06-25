import 'reflect-metadata';
import { expect } from 'chai';
import * as fs from 'fs';
import { describe, it } from 'mocha';
import { Civ7SaveHandler } from './civ7SaveHandler';
import { ActorType } from './saveHandler';

describe('Civ7SaveHandler', () => {
  it('should parse correctly', () => {
    const buffer = fs.readFileSync('testdata/saves/civ7/EmperorAnt1.Civ7Save');
    const handler = new Civ7SaveHandler(buffer);

    expect(handler.gameTurn).to.eq(1);
    expect(handler.gameSpeed).to.eq('GAMESPEED_QUICK');
    expect(handler.mapSize).to.eq('MAPSIZE_SMALL');

    expect(handler.civData.length).to.eq(6);

    // Napoleon and Lakshmibai are the two human players
    const humans = handler.civData.filter(c => c.type === ActorType.HUMAN).map(c => c.leaderName);
    expect(humans).to.have.members(['LEADER_NAPOLEON', 'LEADER_LAKSHMIBAI']);
  });

  it("reads whose turn it is from the PYDT companion mod's stamped property", () => {
    const buffer = fs.readFileSync('testdata/saves/civ7/EmperorAnt1.Civ7Save');
    const handler = new Civ7SaveHandler(buffer);

    // The mod stamped player=1 (Napoleon) as the active player
    const current = handler.civData.filter(c => c.isCurrentTurn);
    expect(current.length).to.eq(1);
    expect(current[0].leaderName).to.eq('LEADER_NAPOLEON');
    expect(current[0].type).to.eq(ActorType.HUMAN);
  });

  it('surfaces enabled mods (including the PYDT limiter) via parsedDlcs', () => {
    const buffer = fs.readFileSync('testdata/saves/civ7/EmperorAnt1.Civ7Save');
    const handler = new Civ7SaveHandler(buffer);

    expect(handler.parsedDlcs).to.include('pydt-hotseat-limiter');
  });
});
