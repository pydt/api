import 'reflect-metadata';
import * as civ7 from 'civ7-save-parser';
import { expect } from 'chai';
import * as fs from 'fs';
import { describe, it } from 'mocha';
import { Civ7SaveHandler, setPydtPlayerNames } from './civ7SaveHandler';
import { ActorType } from './saveHandler';
import { Game } from '../models';

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

  it('reports a defeated player as DEAD', () => {
    const handler = new Civ7SaveHandler(
      fs.readFileSync('testdata/saves/civ7/dead_valamas.Civ7Save')
    );

    const ibnBattuta = handler.civData.find(c => c.leaderName === 'LEADER_IBN_BATTUTA');
    expect(ibnBattuta.type).to.eq(ActorType.DEAD);

    // everyone else is still alive (Human or AI, never DEAD)
    const others = handler.civData.filter(c => c.leaderName !== 'LEADER_IBN_BATTUTA');
    expect(others.every(c => c.type !== ActorType.DEAD)).to.eq(true);
  });

  describe('age transitions (gameTurn across ages)', () => {
    const PYDT_MARKER = Buffer.from([0x92, 0x25, 0xc8, 0x8e]); // hash of GameTutorial key "PYDT"
    const TURN_52_SAVE = 'testdata/saves/civ7/dead_valamas.Civ7Save'; // AGE_ANTIQUITY, turn 52

    // Replace the PYDT property's value, the same way setPydtPlayerNames does.
    function withPydtValue(save: Buffer, value: string) {
      const dec = civ7.decompress(save);
      const start = dec.indexOf(PYDT_MARKER) + 20;
      const end = dec.indexOf(0, start);
      const newValue = Buffer.from(value, 'utf8');
      const result = Buffer.concat([
        dec.subarray(0, start),
        newValue,
        Buffer.from([0]),
        dec.subarray(end + 1)
      ]);
      result.writeUInt16LE(newValue.length + 1, start - 8);
      return civ7.writeCompressedData(save, result);
    }

    // The test saves are all Antiquity; pretend a save is from another age.
    function handlerInAge(file: string | Buffer, game: Game, age?: string) {
      const handler = new Civ7SaveHandler(
        Buffer.isBuffer(file) ? file : fs.readFileSync(file),
        game
      );

      if (age) {
        handler.parsed.age = { ...handler.parsed.age, value: age };
      }

      return handler;
    }

    function makeGame(round: number, saveHandlerData?: Record<string, unknown>) {
      return { round, saveHandlerData } as Game;
    }

    it("reports the save's own turn when there is no game", () => {
      expect(new Civ7SaveHandler(fs.readFileSync(TURN_52_SAVE)).gameTurn).to.eq(52);
    });

    // MachiavelliAnt1 (turn 1) as saved by the mod on the first curtain of a new age.
    function flaggedTurn1Save() {
      return withPydtValue(
        fs.readFileSync(SAVE),
        JSON.stringify({ player: 1, turn: 1, ageTransition: true })
      );
    }

    it('gives an unrecorded, unflagged age no offset and records nothing', () => {
      const game = makeGame(52);

      expect(handlerInAge(TURN_52_SAVE, game).gameTurn).to.eq(52);
      expect(game.saveHandlerData).to.eq(undefined);
    });

    it('maps the flagged first save of a new age to the round after the current one', () => {
      const game = makeGame(71);
      const handler = handlerInAge(flaggedTurn1Save(), game, 'AGE_EXPLORATION');

      expect(handler.pydtTurnData.ageTransition).to.eq(true);
      expect(handler.gameTurn).to.eq(72);
      expect(game.saveHandlerData).to.deep.eq({
        v: 1,
        ageStartRounds: { AGE_EXPLORATION: 72 }
      });
    });

    it('keeps earlier ages when a later one starts', () => {
      const game = makeGame(140, { v: 1, ageStartRounds: { AGE_EXPLORATION: 72 } });

      expect(handlerInAge(flaggedTurn1Save(), game, 'AGE_MODERN').gameTurn).to.eq(141);
      expect(game.saveHandlerData).to.deep.eq({
        v: 1,
        ageStartRounds: { AGE_EXPLORATION: 72, AGE_MODERN: 141 }
      });
    });

    it('offsets later turns of the new age by its start round', () => {
      const data = { v: 1, ageStartRounds: { AGE_EXPLORATION: 72 } };
      const game = makeGame(122, data);

      expect(handlerInAge(TURN_52_SAVE, game, 'AGE_EXPLORATION').gameTurn).to.eq(123);
      // nothing new to record
      expect(game.saveHandlerData).to.eq(data);
    });

    it('ignores the flag once the age is recorded', () => {
      const data = { v: 1, ageStartRounds: { AGE_EXPLORATION: 72 } };
      const game = makeGame(90, data);

      expect(handlerInAge(flaggedTurn1Save(), game, 'AGE_EXPLORATION').gameTurn).to.eq(72);
      expect(game.saveHandlerData).to.eq(data);
    });

    it('gives a save from the starting age no offset after a transition (revert)', () => {
      const game = makeGame(71, { v: 1, ageStartRounds: { AGE_EXPLORATION: 72 } });

      expect(handlerInAge(TURN_52_SAVE, game).gameTurn).to.eq(52);
    });

    it('maps a real first save of the Exploration Age to the next round', () => {
      // Saved by the mod on the first curtain after the Antiquity Age ended at the
      // end of round 70 (player 4 ended the last turn and finished the age).
      const game = makeGame(70);
      const handler = new Civ7SaveHandler(
        fs.readFileSync('testdata/saves/civ7/KingsExp1.Civ7Save'),
        game
      );

      expect(handler.age).to.eq('AGE_EXPLORATION');
      expect(handler.pydtTurnData.ageTransition).to.eq(true);
      expect(handler.gameTurn).to.eq(71);
      expect(game.saveHandlerData).to.deep.eq({
        v: 1,
        ageStartRounds: { AGE_EXPLORATION: 71 }
      });

      const current = handler.civData.filter(c => c.isCurrentTurn);
      expect(current.map(c => c.leaderName)).to.deep.eq(['LEADER_XERXES']);
      expect(current[0].civName).to.eq('CIVILIZATION_ABBASID');
    });

    it('maps an unflagged first save of the Exploration Age to the next round', () => {
      // 000403: the Antiquity Age ended at the end of round 67, but the save lost
      // the mod's ageTransition flag.
      const game = makeGame(67);
      const handler = new Civ7SaveHandler(
        fs.readFileSync('testdata/saves/civ7/000403.Civ7Save'),
        game
      );

      expect(handler.age).to.eq('AGE_EXPLORATION');
      expect(handler.pydtTurnData.ageTransition).to.eq(false);
      expect(handler.gameTurn).to.eq(68);
      expect(game.saveHandlerData).to.deep.eq({
        v: 1,
        ageStartRounds: { AGE_EXPLORATION: 68 }
      });
    });

    describe('which round the new age starts on (turn order)', () => {
      // Four humans; the game's current player is the one uploading.
      function gameWithCurrent(round: number, currentIndex: number) {
        const players = [0, 1, 2, 3].map(i => ({ steamId: `s${i}`, civType: `c${i}` }));
        return { round, players, currentPlayerSteamId: `s${currentIndex}` } as Game;
      }

      it('starts on the next round when the last player finished the age', () => {
        const game = gameWithCurrent(67, 3);

        expect(handlerInAge(SAVE, game, 'AGE_EXPLORATION').gameTurn).to.eq(68);
        expect(game.saveHandlerData).to.deep.eq({
          v: 1,
          ageStartRounds: { AGE_EXPLORATION: 68 }
        });
      });

      it('starts on the current round when the first player finished the age and played turn 1', () => {
        // 000282: the previous upload was Antiquity's last turn with player 0 up
        // (round 71). Player 0 finished the age, played Exploration turn 1 and
        // saved with player 1 up, which PYDT expects as round 71.
        const game = gameWithCurrent(71, 0);
        const handler = new Civ7SaveHandler(
          fs.readFileSync('testdata/saves/civ7/000282.Civ7Save'),
          game
        );

        expect(handler.age).to.eq('AGE_EXPLORATION');
        expect(handler.gameTurn).to.eq(71);
        expect(game.saveHandlerData).to.deep.eq({
          v: 1,
          ageStartRounds: { AGE_EXPLORATION: 71 }
        });
      });
    });

    it('treats an unflagged turn 1 in a later age as a new age', () => {
      const game = makeGame(140, { v: 1, ageStartRounds: { AGE_EXPLORATION: 72 } });
      const handler = handlerInAge(SAVE, game, 'AGE_MODERN');

      expect(handler.gameTurn).to.eq(141);
      expect(game.saveHandlerData).to.deep.eq({
        v: 1,
        ageStartRounds: { AGE_EXPLORATION: 72, AGE_MODERN: 141 }
      });
    });

    it('does not offset the starting age of a game begun in a later age', () => {
      // Round 1: every save is turn 1 of the age the game started in.
      const game = makeGame(1);

      expect(handlerInAge(SAVE, game, 'AGE_EXPLORATION').gameTurn).to.eq(1);
      expect(game.saveHandlerData).to.eq(undefined);
    });

    it('does not treat an unflagged Antiquity turn 1 as a new age', () => {
      const game = makeGame(30);

      expect(handlerInAge(SAVE, game).gameTurn).to.eq(1);
      expect(game.saveHandlerData).to.eq(undefined);
    });

    it('does not treat a later turn of an unrecorded age as a new age', () => {
      const game = makeGame(52);

      expect(handlerInAge(TURN_52_SAVE, game, 'AGE_EXPLORATION').gameTurn).to.eq(52);
      expect(game.saveHandlerData).to.eq(undefined);
    });

    describe('reset game state on next upload', () => {
      function makeResetGame(round: number, saveHandlerData?: Record<string, unknown>) {
        return { round, saveHandlerData, resetGameStateOnNextUpload: true } as Game;
      }

      it('re-records a new age on the next round, replacing the old record', () => {
        // Reset to an Antiquity save, then the age ended on round 70 this time.
        const game = makeResetGame(70, { v: 1, ageStartRounds: { AGE_EXPLORATION: 68 } });

        expect(handlerInAge(SAVE, game, 'AGE_EXPLORATION').gameTurn).to.eq(71);
        expect(game.saveHandlerData).to.deep.eq({
          v: 1,
          ageStartRounds: { AGE_EXPLORATION: 71 }
        });
      });

      it('drops ages recorded after an earlier save, so the next transition records afresh', () => {
        const game = makeResetGame(90, { v: 1, ageStartRounds: { AGE_EXPLORATION: 68 } });

        expect(handlerInAge(TURN_52_SAVE, game).gameTurn).to.eq(52);
        expect(game.saveHandlerData).to.deep.eq({ v: 1, ageStartRounds: {} });

        // Back to a normal upload: the replayed transition at round 70 is recorded.
        const next = makeGame(70, game.saveHandlerData);
        expect(handlerInAge(SAVE, next, 'AGE_EXPLORATION').gameTurn).to.eq(71);
      });

      it('keeps the record for a mid-age save and drops later ages', () => {
        const game = makeResetGame(150, {
          v: 1,
          ageStartRounds: { AGE_EXPLORATION: 68, AGE_MODERN: 140 }
        });

        // Exploration turn 52 is round 119, before Modern began.
        expect(handlerInAge(TURN_52_SAVE, game, 'AGE_EXPLORATION').gameTurn).to.eq(119);
        expect(game.saveHandlerData).to.deep.eq({
          v: 1,
          ageStartRounds: { AGE_EXPLORATION: 68 }
        });
      });

      it('keeps earlier ages when the save is after them', () => {
        const data = { v: 1, ageStartRounds: { AGE_EXPLORATION: 68 } };
        const game = makeResetGame(90, data);

        expect(handlerInAge(TURN_52_SAVE, game, 'AGE_EXPLORATION').gameTurn).to.eq(119);
        expect(game.saveHandlerData).to.deep.eq(data);
      });
    });

    it('does not read ageTransition from saves without the flag', () => {
      const handler = new Civ7SaveHandler(
        withPydtValue(fs.readFileSync(SAVE), JSON.stringify({ player: 1, turn: 1 }))
      );

      expect(handler.pydtTurnData.ageTransition).to.eq(false);
    });
  });

  describe('team games', () => {
    // Team games put two civs on the same team; PLAYER_ID used to be shared across
    // both teammates (a parser bug fixed in civ7-save-parser 1.0.5 - it now reports
    // the per-civ slot id, not the team id). These saves capture a real turn handoff
    // between two human teammates (Ashoka and Edward Teach, both on team 0) and guard
    // against that regressing: exactly one civ - the correct human - must be flagged
    // as the current turn, never zero and never both teammates at once.
    it("resolves Ashoka's turn without matching their AI/human teammate", () => {
      const handler = new Civ7SaveHandler(
        fs.readFileSync('testdata/saves/civ7/teams_ashoka.Civ7Save')
      );

      const current = handler.civData.filter(c => c.isCurrentTurn);
      expect(current.length).to.eq(1);
      expect(current[0].leaderName).to.eq('LEADER_ASHOKA');
      expect(current[0].type).to.eq(ActorType.HUMAN);
    });

    it("resolves Edward Teach's turn after Ashoka ends theirs", () => {
      const handler = new Civ7SaveHandler(
        fs.readFileSync('testdata/saves/civ7/teams_teach.Civ7Save')
      );

      const current = handler.civData.filter(c => c.isCurrentTurn);
      expect(current.length).to.eq(1);
      expect(current[0].leaderName).to.eq('LEADER_EDWARD_TEACH');
      expect(current[0].type).to.eq(ActorType.HUMAN);
    });
  });
});
