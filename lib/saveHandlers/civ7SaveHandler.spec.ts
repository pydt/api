import 'reflect-metadata';
import * as civ7 from 'civ7-save-parser';
import { expect } from 'chai';
import * as fs from 'fs';
import { describe, it } from 'mocha';
import { Civ7SaveHandler, setPydtPlayerNames } from './civ7SaveHandler';
import { ActorType } from './saveHandler';

const SAVE = 'testdata/saves/civ7/MachiavelliAnt1.Civ7Save';

describe('Civ7SaveHandler', () => {
  it('should parse correctly', () => {
    const handler = new Civ7SaveHandler(fs.readFileSync(SAVE));

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

  it('throws if the PYDT companion mod has not stamped the save', () => {
    const original = fs.readFileSync(SAVE);
    const decompressed = civ7.decompress(original);

    const PYDT_MARKER = Buffer.from([0x92, 0x25, 0xc8, 0x8e]); // hash of GameTutorial key "PYDT"
    const markerIdx = decompressed.indexOf(PYDT_MARKER);
    expect(markerIdx).to.be.gte(0);
    decompressed.fill(0, markerIdx, markerIdx + PYDT_MARKER.length);

    const stripped = civ7.writeCompressedData(original, decompressed);

    expect(() => new Civ7SaveHandler(stripped)).to.throw(/PYDT companion mod must be enabled/);
  });

  it("reads whose turn it is from the PYDT companion mod's stamped property (v1 format)", () => {
    const handler = new Civ7SaveHandler(fs.readFileSync(SAVE));

    // The test save has a v1 pipe-delimited PYDT_TURN stamp; player=1 is Machiavelli
    const current = handler.civData.filter(c => c.isCurrentTurn);
    expect(current.length).to.eq(1);
    expect(current[0].leaderName).to.eq('LEADER_MACHIAVELLI');
    expect(current[0].type).to.eq(ActorType.HUMAN);
  });

  it('surfaces enabled mods via parsedDlcs', () => {
    const handler = new Civ7SaveHandler(fs.readFileSync(SAVE));

    expect(handler.parsedDlcs).to.include('napoleon');
    expect(handler.parsedDlcs).to.include('ada-lovelace');
    expect(handler.parsedDlcs).to.include('genghis-khan');
    expect(handler.parsedDlcs).to.include('edward-teach');
  });

  it('can flip a human player to AI (turn skipping) and round-trip', () => {
    let handler = new Civ7SaveHandler(fs.readFileSync(SAVE));

    const napoleon = () => handler.civData.find(c => c.leaderName === 'LEADER_NAPOLEON_ALT');
    expect(napoleon().type).to.eq(ActorType.HUMAN);

    napoleon().type = ActorType.AI;

    handler = new Civ7SaveHandler(handler.getData());
    expect(napoleon().type).to.eq(ActorType.AI);
    expect(handler.civData.find(c => c.leaderName === 'LEADER_MACHIAVELLI').type).to.eq(
      ActorType.HUMAN
    );
  });

  describe('player names (setPydtPlayerNames / cleanupSave)', () => {
    const PYDT_MARKER = Buffer.from([0x92, 0x25, 0xc8, 0x8e]); // hash of GameTutorial key "PYDT"

    // Read the PYDT property's JSON value back out of a written save. Anchored on
    // the marker, BYTE offsets — char indices into toString('utf8') don't line up
    // on a binary blob (the value is 20 bytes after the marker).
    function readPydtJson(save: Buffer) {
      const dec = civ7.decompress(save);
      const mi = dec.indexOf(PYDT_MARKER);
      expect(mi).to.be.gte(0);
      const value = dec.subarray(mi + 20, dec.indexOf(0, mi + 20)).toString('utf8');
      expect(value[0]).to.eq('{');
      return JSON.parse(value);
    }

    it('writes names as pure JSON on cleanupSave', () => {
      const handler = new Civ7SaveHandler(fs.readFileSync(SAVE));

      handler.civData.find(c => c.leaderName === 'LEADER_BENJAMIN_FRANKLIN').playerName = 'SackGT';
      handler.civData.find(c => c.leaderName === 'LEADER_MACHIAVELLI').playerName = 'Bob|the;Great';
      handler.civData.find(c => c.leaderName === 'LEADER_NAPOLEON_ALT').playerName = 'Nápoléon 🎮';
      handler.cleanupSave();

      const payload = readPydtJson(handler.getData());
      expect(Object.values(payload.names)).to.have.members([
        'SackGT',
        'Bob|the;Great',
        'Nápoléon 🎮'
      ]);
    });

    it('names survive a parse round-trip', () => {
      let handler = new Civ7SaveHandler(fs.readFileSync(SAVE));

      handler.civData.find(c => c.leaderName === 'LEADER_MACHIAVELLI').playerName = 'Bob|the;Great';
      handler.cleanupSave();

      // re-parse from the written buffer
      handler = new Civ7SaveHandler(handler.getData());

      expect(handler.pydtTurnData).to.exist;
      expect(Object.values(handler.pydtTurnData.names ?? {})).to.include('Bob|the;Great');
      // isCurrentTurn still works after the recompress
      expect(handler.civData.find(c => c.isCurrentTurn).leaderName).to.eq('LEADER_MACHIAVELLI');
    });

    it('setPydtPlayerNames writes JSON, preserving player/turn', () => {
      const updated = setPydtPlayerNames(fs.readFileSync(SAVE), { 0: 'Alice', 1: 'Bob' });

      const payload = readPydtJson(updated);
      expect(payload.names['0']).to.eq('Alice');
      expect(payload.names['1']).to.eq('Bob');
      // player/turn are preserved from the existing value
      expect(payload.player).to.be.a('number');
      expect(payload.turn).to.be.a('number');
    });

    it('setPydtPlayerNames round-trips through a v2 save without corrupting player/turn', () => {
      const original = fs.readFileSync(SAVE);
      const v2 = setPydtPlayerNames(original, { 0: 'First', 1: 'Second' });

      const handlerV2 = new Civ7SaveHandler(v2);
      const playerBefore = handlerV2.pydtTurnData.currentPlayer;
      const turnBefore = handlerV2.pydtTurnData.turn;

      const v2again = setPydtPlayerNames(v2, { 0: 'Updated', 1: 'Second' });
      const handlerV2again = new Civ7SaveHandler(v2again);

      expect(handlerV2again.pydtTurnData.currentPlayer).to.eq(playerBefore);
      expect(handlerV2again.pydtTurnData.turn).to.eq(turnBefore);
      expect(handlerV2again.pydtTurnData.names['0']).to.eq('Updated');
    });
  });
});
