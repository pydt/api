import { expect } from 'chai';
import * as fs from 'fs';
import { describe, it } from 'mocha';
import { Civ5SaveHandler } from '../lib/saveHandlers/civ5SaveHandler';
import { ActorType } from '../lib/saveHandlers/saveHandler';

describe('Civ5SaveHandler', () => {

  it('should parse correctly', async () => {
    const buffer = fs.readFileSync('test/saves/civ5/Harald Bluetooth_0164 AD-1695.Civ5Save');
    const handler = new Civ5SaveHandler(buffer);

    expect(handler.gameSpeed).to.eq('GAMESPEED_QUICK');
    expect(handler.gameTurn).to.eq(164);
    expect(handler.mapFile).to.eq('Assets\\Maps\\Continents.lua');
    expect(handler.mapSize).to.eq('WORLDSIZE_TINY');

    //expect(handler.parsedDlcs.length).to.eq(14);
    //expect(handler.parsedDlcs[0]).to.eq('Mongolia');

    expect(handler.civData.length).to.eq(4);
    expect(handler.civData[1].isCurrentTurn).to.eq(true);
    expect(handler.civData[0].leaderName).to.eq('LEADER_HARALD');
    expect(handler.civData[0].password).to.eq('rosackciv5');
    expect(handler.civData[0].playerName).to.eq('Player 1');
    expect(handler.civData[0].type).to.eq(ActorType.HUMAN);
  });

  it('should update civs correctly', () => {
    const buffer = fs.readFileSync('test/saves/civ5/Harald Bluetooth_0164 AD-1695.Civ5Save');
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

    //expect(handler.parsedDlcs.length).to.eq(14);
    //expect(handler.parsedDlcs[0]).to.eq('Mongolia');

    expect(handler.civData.length).to.eq(4);
    expect(handler.civData[2].isCurrentTurn).to.eq(true);
    expect(handler.civData[0].leaderName).to.eq('LEADER_HARALD');
    expect(handler.civData[0].password).to.eq('password');
    expect(handler.civData[0].playerName).to.eq('playerName');
    expect(handler.civData[0].type).to.eq(ActorType.AI);
  });

});