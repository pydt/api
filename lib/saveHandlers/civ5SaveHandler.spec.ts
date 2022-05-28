import 'reflect-metadata';
import { expect } from 'chai';
import * as fs from 'fs';
import { describe, it } from 'mocha';
import { Civ5SaveHandler } from './civ5SaveHandler';
import { ActorType } from './saveHandler';

describe('Civ5SaveHandler', () => {
  it('should parse correctly', async () => {
    const buffer = fs.readFileSync('testdata/saves/civ5/Harald Bluetooth_0164 AD-1695.Civ5Save');
    const handler = new Civ5SaveHandler(buffer);

    expect(handler.gameSpeed).to.eq('GAMESPEED_QUICK');
    expect(handler.gameTurn).to.eq(164);
    expect(handler.mapFile).to.eq('Assets\\Maps\\Continents.lua');
    expect(handler.mapSize).to.eq('WORLDSIZE_TINY');
    expect(handler.parsedDlcs).to.deep.equal([
      'e31e3c297611f644ac1f59663826de74',
      'ded585b6ca7c754e81b42f60754e6330',
      '05c6f7ec11baac4c8d80d71306aac471',
      '390d03b3d8c0c74b91b17ad1caf585ab',
      'b2222c110853b642b734171ccab3037b',
      '32ba59746457ae448e9501ad0e0efd48',
      'a151370e40f81b4e9706519bf484e59d',
      '3676a06d23411840b6436575b4ec336b'
    ]);

    expect(handler.civData.length).to.eq(4);
    expect(handler.civData[1].isCurrentTurn).to.eq(true);
    expect(handler.civData[0].leaderName).to.eq('LEADER_HARALD');
    expect(handler.civData[0].password).to.eq('rosackciv5');
    expect(handler.civData[0].playerName).to.eq('Player 1');
    expect(handler.civData[0].type).to.eq(ActorType.HUMAN);
  });

  it('should parse beyond earth correctly', async () => {
    const buffer = fs.readFileSync('testdata/saves/civ5/beyondearth.CivBESave');
    const handler = new Civ5SaveHandler(buffer);

    expect(handler.gameSpeed).to.eq('GAMESPEED_QUICK');
    expect(handler.gameTurn).to.eq(0);
    expect(handler.mapFile).to.eq('Assets\\Maps\\Protean.lua');
    expect(handler.mapSize).to.eq('WORLDSIZE_SMALL');
    expect(handler.parsedDlcs).to.deep.equal([
      '54df493fb668d144a930a168628faa59',
      '57b2d25491c545408f17a69f033166c7'
    ]);

    expect(handler.civData.length).to.eq(6);
    expect(handler.civData[1].isCurrentTurn).to.eq(true);
    expect(handler.civData[0].leaderName).to.eq('LEADER_ARC');
    expect(handler.civData[0].password).to.eq('');
    expect(handler.civData[0].playerName).to.eq('Player 1');
    expect(handler.civData[0].type).to.eq(ActorType.HUMAN);
  });

  it('should update civs correctly', () => {
    const buffer = fs.readFileSync('testdata/saves/civ5/Harald Bluetooth_0164 AD-1695.Civ5Save');
    let handler = new Civ5SaveHandler(buffer);

    const civ = handler.civData[0];
    civ.password = 'password';
    civ.playerName = 'playerName';
    civ.type = ActorType.AI;
    handler.setCurrentTurnIndex(2);

    handler = new Civ5SaveHandler(handler.getData());

    expect(handler.gameSpeed).to.eq('GAMESPEED_QUICK');
    expect(handler.gameTurn).to.eq(164);
    expect(handler.mapFile).to.eq('Assets\\Maps\\Continents.lua');
    expect(handler.mapSize).to.eq('WORLDSIZE_TINY');

    expect(handler.civData.length).to.eq(4);
    expect(handler.civData[2].isCurrentTurn).to.eq(true);
    expect(handler.civData[0].leaderName).to.eq('LEADER_HARALD');
    expect(handler.civData[0].password).to.eq('password');
    expect(handler.civData[0].playerName).to.eq('playerName');
    expect(handler.civData[0].type).to.eq(ActorType.AI);
  });
});
