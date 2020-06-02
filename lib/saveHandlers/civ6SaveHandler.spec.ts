import 'reflect-metadata';
import { expect } from 'chai';
import * as fs from 'fs';
import { describe, it } from 'mocha';
import { Civ6SaveHandler } from './civ6SaveHandler';
import { ActorType } from './saveHandler';

describe('Civ6SaveHandler', () => {

  it('should parse correctly', () => {
    const buffer = fs.readFileSync('testdata/saves/civ6/CATHERINE DE MEDICI 1 4000 BC.Civ6Save');
    const handler = new Civ6SaveHandler(buffer);

    expect(handler.gameSpeed).to.eq('GAMESPEED_ONLINE');
    expect(handler.gameTurn).to.eq(1);
    expect(handler.mapFile).to.eq('Pangaea.lua');
    expect(handler.mapSize).to.eq('MAPSIZE_TINY');

    expect(handler.parsedDlcs.length).to.eq(1);
    expect(handler.parsedDlcs[0]).to.eq('02A8BDDE-67EA-4D38-9540-26E685E3156E');

    expect(handler.civData.length).to.eq(4);
    expect(handler.civData[0].isCurrentTurn).to.eq(true);
    expect(handler.civData[0].leaderName).to.eq('LEADER_CATHERINE_DE_MEDICI');
    expect(handler.civData[0].password).to.be.undefined;
    expect(handler.civData[0].playerName).to.eq('Player 1');
    expect(handler.civData[0].type).to.eq(ActorType.HUMAN);
  });

  it('should update civs correctly', () => {
    const buffer = fs.readFileSync('testdata/saves/civ6/CATHERINE DE MEDICI 1 4000 BC.Civ6Save');
    let handler = new Civ6SaveHandler(buffer);

    const civ = handler.civData[0];
    civ.password = 'password';
    civ.playerName = 'playerName';
    civ.type = ActorType.AI;

    handler = new Civ6SaveHandler(handler.getData());

    expect(handler.gameSpeed).to.eq('GAMESPEED_ONLINE');
    expect(handler.gameTurn).to.eq(1);
    expect(handler.mapFile).to.eq('Pangaea.lua');
    expect(handler.mapSize).to.eq('MAPSIZE_TINY');

    expect(handler.parsedDlcs.length).to.eq(1);
    expect(handler.parsedDlcs[0]).to.eq('02A8BDDE-67EA-4D38-9540-26E685E3156E');

    expect(handler.civData.length).to.eq(4);
    expect(handler.civData[0].isCurrentTurn).to.eq(true);
    expect(handler.civData[0].leaderName).to.eq('LEADER_CATHERINE_DE_MEDICI');
    expect(handler.civData[0].password).to.eq('password');
    expect(handler.civData[0].playerName).to.eq('playerName');
    expect(handler.civData[0].type).to.eq(ActorType.AI);
  });

});