import 'reflect-metadata';
import { expect } from 'chai';
import * as fs from 'fs';
import { describe, it } from 'mocha';
import { ActorType } from './saveHandler';
import { OldWorldSaveHandler } from './oldWorldSaveHandler';

describe('OldWorldSaveHandler', () => {
  it('should parse correctly', () => {
    const buffer = fs.readFileSync('testdata/saves/oldWorld/Turn1.zip');
    const handler = new OldWorldSaveHandler(buffer);

    expect(handler.gameSpeed).to.eq('');
    expect(handler.gameTurn).to.eq(1);
    expect(handler.mapFile).to.eq('MAPCLASS_CoastalRainBasin');
    expect(handler.mapSize).to.eq('MAPSIZE_MEDIUM');

    expect(handler.parsedDlcs.length).to.eq(0);

    expect(handler.civData.length).to.eq(2);
    expect(handler.civData[0].isCurrentTurn).to.eq(false);
    expect(handler.civData[0].leaderName).to.eq('NATION_ROME');
    expect(handler.civData[0].password).to.eq('');
    expect(handler.civData[0].playerName).to.eq('mrosack');
    expect(handler.civData[0].type).to.eq(ActorType.HUMAN);
    expect(handler.civData[1].isCurrentTurn).to.eq(true);
  });

  it('should parse correctly (newer format)', () => {
    const buffer = fs.readFileSync('testdata/saves/oldWorld/Turn1B.zip');
    const handler = new OldWorldSaveHandler(buffer);

    expect(handler.gameSpeed).to.eq('');
    expect(handler.gameTurn).to.eq(1);
    expect(handler.mapFile).to.eq('MAPCLASS_CoastalRainBasin');
    expect(handler.mapSize).to.eq('MAPSIZE_MEDIUM');

    expect(handler.parsedDlcs.length).to.eq(0);

    expect(handler.civData.length).to.eq(5);
    expect(handler.civData[0].isCurrentTurn).to.eq(false);
    expect(handler.civData[0].leaderName).to.eq('NATION_ASSYRIA');
    expect(handler.civData[0].password).to.eq('');
    expect(handler.civData[0].playerName).to.eq('matt');
    expect(handler.civData[0].type).to.eq(ActorType.HUMAN);
    expect(handler.civData[1].isCurrentTurn).to.eq(true);
  });

  it('should update civs correctly', () => {
    const buffer = fs.readFileSync('testdata/saves/oldWorld/Turn1.zip');
    let handler = new OldWorldSaveHandler(buffer);

    const civ = handler.civData[0];
    //civ.password = 'password';
    civ.playerName = 'playerName';
    //civ.type = ActorType.AI;

    handler = new OldWorldSaveHandler(handler.getData());

    expect(handler.gameSpeed).to.eq('');
    expect(handler.gameTurn).to.eq(1);
    expect(handler.mapFile).to.eq('MAPCLASS_CoastalRainBasin');
    expect(handler.mapSize).to.eq('MAPSIZE_MEDIUM');

    expect(handler.parsedDlcs.length).to.eq(0);

    expect(handler.civData.length).to.eq(2);
    expect(handler.civData[0].isCurrentTurn).to.eq(false);
    expect(handler.civData[0].leaderName).to.eq('NATION_ROME');
    expect(handler.civData[0].password).to.eq('');
    expect(handler.civData[0].playerName).to.eq('playerName');
    expect(handler.civData[0].type).to.eq(ActorType.HUMAN);
    expect(handler.civData[1].isCurrentTurn).to.eq(true);
  });

  it('should update civs correctly (newer format)', () => {
    const buffer = fs.readFileSync('testdata/saves/oldWorld/Turn1B.zip');
    let handler = new OldWorldSaveHandler(buffer);

    const civ = handler.civData[0];
    //civ.password = 'password';
    civ.playerName = 'playerName';
    //civ.type = ActorType.AI;

    handler = new OldWorldSaveHandler(handler.getData());

    expect(handler.gameSpeed).to.eq('');
    expect(handler.gameTurn).to.eq(1);
    expect(handler.mapFile).to.eq('MAPCLASS_CoastalRainBasin');
    expect(handler.mapSize).to.eq('MAPSIZE_MEDIUM');

    expect(handler.parsedDlcs.length).to.eq(0);

    expect(handler.civData.length).to.eq(5);
    expect(handler.civData[0].isCurrentTurn).to.eq(false);
    expect(handler.civData[0].leaderName).to.eq('NATION_ASSYRIA');
    expect(handler.civData[0].password).to.eq('');
    expect(handler.civData[0].playerName).to.eq('playerName');
    expect(handler.civData[0].type).to.eq(ActorType.HUMAN);
    expect(handler.civData[1].isCurrentTurn).to.eq(true);
  });

  it('should detect dead correctly', () => {
    const buffer = fs.readFileSync('testdata/saves/oldWorld/deadtest.zip');
    const handler = new OldWorldSaveHandler(buffer);

    expect(handler.civData.length).to.eq(5);
    expect(handler.civData[0].type).to.eq(ActorType.HUMAN);
    expect(handler.civData[1].type).to.eq(ActorType.HUMAN);
    expect(handler.civData[2].type).to.eq(ActorType.DEAD);
    expect(handler.civData[3].type).to.eq(ActorType.HUMAN);
    expect(handler.civData[4].type).to.eq(ActorType.HUMAN);
  });

  it('parses new format saved by mod 1.03', () => {
    const buffer = fs.readFileSync('testdata/saves/oldWorld/mod103format.zip');
    const handler = new OldWorldSaveHandler(buffer);

    expect(handler.civData.length).to.eq(4);
  });
});
