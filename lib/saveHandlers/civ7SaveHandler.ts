import * as civ7 from 'civ7-save-parser';
import { ActorType, CivData, SaveHandler } from './saveHandler';
import { Game } from '../models';
import { CIV7_DLCS } from '../metadata/civGames/civ7';
import { orderBy } from 'lodash';
import { HttpResponseError } from './../../api/framework/httpResponseError';

/**
 * Whose-turn is not readable from a Civ7 save in any stable way (it lives only in
 * the compressed, hash-keyed game state — see the civ7-save-parser REVERSING.md).
 * Instead, the PYDT companion mod stamps it via `GameTutorial.setProperty("PYDT", value)`,
 * which persists as a UTF-8 string chunk inside the compressed blob.
 *
 * Value format (current): pure JSON  {"player":<id>,"turn":<n>,"names":{...}}
 * Legacy value format:    pipe-delimited  PYDT_TURN|player=<id>|turn=<n>
 *
 * Locating the value: the property key "PYDT" is hashed (like every Civ7 field)
 * into a stable 4-byte marker — there is NO literal "PYDT" / "PYDT\0" key in the
 * blob. The value is a UTF-8 string chunk: 20 bytes of header (4B marker + 4B type
 * + 4B pad + 2B u16 len + 2B flag + 4B key), then the null-terminated string. So
 * the value starts 20 bytes after the marker and the chunk's u16 byte-length is 8
 * bytes before it. NB: all offsets are BYTE offsets — the blob is binary, so
 * toString('utf8') char indices don't line up and must never be used to splice.
 */
const PYDT_PROPERTY_MARKER = Buffer.from([0x92, 0x25, 0xc8, 0x8e]); // hash of GameTutorial key "PYDT"

interface PydtTurnData {
  currentPlayer?: number;
  turn?: number;
  names?: Record<string, string>;
  ageTransition?: boolean;
}

// On-disk JSON shape (key names match what the companion mod writes)
interface PydtPayload {
  player?: number;
  turn?: number;
  names?: Record<string, string>;
  // Set by the mod on the first save of a new age it just transitioned to.
  ageTransition?: boolean;
}

/**
 * What the Civ 7 handler keeps in game.saveHandlerData.
 *
 * Civ 7 restarts its turn counter at 1 in every age, but PYDT's round must keep
 * counting up (images, restart limits, revert and notifications all key off it).
 * So gameTurn reports `turn in age + ageStartRounds[age] - 1`. An age that
 * isn't recorded (the age the game started in) has no offset.
 */
export interface Civ7SaveHandlerData {
  v: 1;
  // PYDT round on which each later age began, keyed by age type (AGE_EXPLORATION...)
  ageStartRounds?: Record<string, number>;
}

// Locate the PYDT property value chunk by its stable marker. Returns the value
// string and the BYTE offsets where it starts/ends (the null), or undefined.
function findPydtValue(buf: Buffer): { value: string; start: number; end: number } | undefined {
  const markerIdx = buf.indexOf(PYDT_PROPERTY_MARKER);
  if (markerIdx < 0) return undefined;
  const start = markerIdx + 20;
  const end = buf.indexOf(0, start);
  if (end < 0) return undefined;
  return { value: buf.subarray(start, end).toString('utf8'), start, end };
}

// Parse the value, which is either pure JSON {...} or legacy PYDT_TURN|player=..|turn=..
function parsePydtValue(value: string): PydtTurnData {
  if (value.startsWith('{')) {
    try {
      const payload = JSON.parse(value) as PydtPayload;
      return {
        currentPlayer: payload.player,
        turn: payload.turn,
        names: payload.names,
        ageTransition: payload.ageTransition === true
      };
    } catch {
      return {};
    }
  }

  const fields: Record<string, string> = {};
  for (const part of value.replace(/^PYDT_TURN\|/, '').split('|')) {
    const eq = part.indexOf('=');
    if (eq > 0) fields[part.slice(0, eq)] = part.slice(eq + 1);
  }
  const num = (s?: string) => (s !== undefined && /^\d+$/.test(s) ? Number(s) : undefined);
  return { currentPlayer: num(fields.player), turn: num(fields.turn) };
}

function parsePydtTurnData(data: Buffer): PydtTurnData | undefined {
  const decompressed = civ7.decompress(data);
  if (!decompressed) return undefined;

  const found = findPydtValue(decompressed);
  return found ? parsePydtValue(found.value) : undefined;
}

/**
 * Write player display names into the save for the hotseat curtain. Merges names
 * into the PYDT companion mod's property and rewrites it as v2 JSON format
 * (PYDT_TURN{...}), which the mod can decode with JSON.parse without needing atob.
 *
 * The value is a variable-length UTF-8 chunk in the compressed blob (the game
 * tolerates length changes — verified in-game). We splice the new value in,
 * update the chunk's u16 byte-length (8 bytes before the value), and recompress.
 *
 * Requires the companion mod to have stamped its property first (throws if not).
 * Upgrades v1 pipe-delimited saves to v2 JSON on first write.
 */
export function setPydtPlayerNames(data: Buffer, names: Record<number, string>): Buffer {
  const decompressed = civ7.decompress(data);
  if (!decompressed) throw new Error('Save has no compressed section');

  const found = findPydtValue(decompressed);
  if (!found) throw new Error('PYDT companion mod property not found in save');

  // Preserve player/turn from the existing value (JSON or legacy), replace names,
  // and always write pure JSON. All offsets are BYTE offsets into the blob.
  const { currentPlayer, turn } = parsePydtValue(found.value);
  const newValue = Buffer.from(JSON.stringify({ player: currentPlayer, turn, names }), 'utf8');

  const result = Buffer.concat([
    decompressed.subarray(0, found.start),
    newValue,
    Buffer.from([0]),
    decompressed.subarray(found.end + 1)
  ]);
  result.writeUInt16LE(newValue.length + 1, found.start - 8); // chunk u16 byte-length

  return civ7.writeCompressedData(data, result);
}

const ACTOR_TYPE_MAP = [
  { intVal: civ7.PlayerType.AI, actorType: ActorType.AI },
  { intVal: civ7.PlayerType.HUMAN, actorType: ActorType.HUMAN }
];

export class Civ7CivData implements CivData {
  constructor(
    private player,
    private handler: Civ7SaveHandler
  ) {}

  get type() {
    // ALIVE_FLAGS (uncompressed group3 record) takes precedence over PLAYER_TYPE:
    // a defeated player's PLAYER_TYPE stays Human/AI, but isAlive flips to false.
    if (this.player.isAlive === false) {
      return ActorType.DEAD;
    }

    // PLAYER_TYPE: 3 = Human, 1 = AI.
    const match = ACTOR_TYPE_MAP.find(x => x.intVal === this.player.playerType?.value);
    return match ? match.actorType : ActorType.AI;
  }

  set type(value: ActorType) {
    if (value === ActorType.DEAD) {
      throw new Error('Setting DEAD not supported');
    }

    // Used for turn-skipping: flipping a player to AI makes the game play their
    // turn. PLAYER_TYPE is an in-place edit of the uncompressed group3 record
    // (confirmed to work in-game).
    const match = ACTOR_TYPE_MAP.find(x => x.actorType === value);

    if (!match) {
      throw new Error(`Cannot set Civ7 player type to ${ActorType[value]}`);
    }

    this.handler.rawSave = civ7.setPlayerType(this.handler.rawSave, this.player.id, match.intVal);
    this.handler.reparse();
  }

  get leaderName() {
    return this.player.leader.value;
  }

  get civName() {
    return this.player.civ.value;
  }

  get isCurrentTurn(): boolean {
    // Sourced from the PYDT companion mod's stamped property (see above). If the
    // mod isn't installed / hasn't stamped the save, this is always false.
    return this.handler.pydtTurnData?.currentPlayer === this.player.id;
  }

  set isCurrentTurn(_value: boolean) {
    // Not implemented
  }

  // The game's own player-name field isn't writable, so instead we hand names to
  // the companion mod to show on the hotseat curtain. Names set here are recorded
  // and flushed in cleanupSave() (one decompress/recompress for all of them).
  get playerName() {
    return this.handler.pendingNames[this.player.id];
  }

  set playerName(value: string) {
    this.handler.pendingNames[this.player.id] = value;
  }

  get password() {
    return this.player.password;
  }

  set password(_value: string) {
    // Not implemented - no way to set this i can see?
  }
}

export class Civ7SaveHandler implements SaveHandler {
  rawSave: Buffer;
  parsed;
  pydtTurnData: PydtTurnData | undefined;
  civData: CivData[] = [];
  // Player names (by id) set via civData[].playerName, flushed in cleanupSave().
  pendingNames: Record<number, string> = {};

  // The game is optional so the handler can be used standalone (e.g. in specs);
  // without it, gameTurn is just the save's own turn number.
  constructor(
    data: Buffer,
    private game?: Game
  ) {
    this.rawSave = data;
    this.reparse();

    if (!this.pydtTurnData) {
      throw new HttpResponseError(
        400,
        `To play Civilization VII, the PYDT companion mod must be enabled!  You can get it at https://steamcommunity.com/sharedfiles/filedetails/?id=3751833377`
      );
    }
  }

  reparse() {
    this.parsed = civ7.parse(this.rawSave);
    this.pydtTurnData = parsePydtTurnData(this.rawSave);
    this.civData = orderBy(this.parsed.players, x => x.id).map(
      player => new Civ7CivData(player, this)
    );
  }

  get age(): string | undefined {
    return this.parsed.age?.value;
  }

  // The PYDT round for this save: the turn within its age, shifted by the round
  // that age began on (see Civ7SaveHandlerData).
  get gameTurn() {
    const turn = this.parsed.turn?.value;

    if (turn === undefined || !this.game) {
      return turn;
    }

    return turn + this.getAgeStartRound() - 1;
  }

  /**
   * The PYDT round the save's age began on (1 for an age that isn't recorded,
   * i.e. the age the game started in).
   *
   * The first save of a new age is the mod's flagged save (ageTransition), or
   * failing that one that looksLikeNewAge(). That age is then
   * recorded on game.saveHandlerData as starting on the round after the current
   * one, since the save is uploaded at the end of the old age's final round. Once
   * an age is recorded the flag is ignored. This only changes the game in memory;
   * it is persisted when the caller saves the game (finishSubmit does that only
   * after all of its checks pass).
   */
  private getAgeStartRound(): number {
    const age = this.age;

    if (!age) {
      return 1;
    }

    if (this.game.resetGameStateOnNextUpload) {
      return this.getAgeStartRoundForReset(age);
    }

    const ageStartRounds = this.getAgeStartRounds();

    if (ageStartRounds[age] !== undefined) {
      return ageStartRounds[age];
    }

    if (!this.pydtTurnData?.ageTransition && !this.looksLikeNewAge()) {
      return 1;
    }

    const startRound = (this.game.round || 0) + 1;
    this.setAgeStartRounds({ ...ageStartRounds, [age]: startRound });
    return startRound;
  }

  /**
   * "Reset game state on next upload" takes whatever round the save reports, so
   * the save rewrites the record instead of being checked against it. A
   * first-turn save of a later age (re)starts that age on the next round, and
   * ages recorded as starting after the save's round are dropped. That way a
   * game reset to an earlier point records its next transition afresh,
   * whichever round it lands on.
   */
  private getAgeStartRoundForReset(age: string): number {
    const ageStartRounds = { ...this.getAgeStartRounds() };
    if (this.looksLikeNewAge()) {
      ageStartRounds[age] = (this.game.round || 0) + 1;
    }

    const startRound = ageStartRounds[age] ?? 1;
    const saveRound = (this.parsed.turn?.value ?? 1) + startRound - 1;

    for (const [otherAge, otherStart] of Object.entries(ageStartRounds)) {
      if (otherAge !== age && otherStart > saveRound) {
        delete ageStartRounds[otherAge];
      }
    }

    this.setAgeStartRounds(ageStartRounds);
    return startRound;
  }

  private getAgeStartRounds(): Record<string, number> {
    const existing = this.game.saveHandlerData as Partial<Civ7SaveHandlerData> | undefined;
    return existing?.ageStartRounds || {};
  }

  private setAgeStartRounds(ageStartRounds: Record<string, number>) {
    const data: Civ7SaveHandlerData = { v: 1, ageStartRounds };
    this.game.saveHandlerData = { ...data };
  }

  /**
   * A new age without the mod's flag (the flag can be lost, e.g. if the save is
   * reloaded and saved again before uploading): turn 1 of an unrecorded age that
   * isn't Antiquity, after the game's first round. Antiquity is always the age a
   * game starts in when it has one, and a game started in a later age is still in
   * round 1 while its saves are on turn 1, so neither gets a bogus offset.
   */
  private looksLikeNewAge(): boolean {
    return (
      this.parsed.turn?.value === 1 && (this.game.round || 0) > 1 && this.age !== 'AGE_ANTIQUITY'
    );
  }

  get gameSpeed() {
    return this.parsed.gameSpeed?.value;
  }

  get mapSize() {
    return this.parsed.mapSize?.value;
  }

  get mapFile() {
    // Civ7 saves don't expose a map-script file name like Civ6/5 did. TODO if needed.
    return '';
  }

  get parsedDlcs() {
    const result = [];

    for (const mod of this.parsed.mods.filter(mod => mod.enabled).map(mod => mod.id)) {
      if (CIV7_DLCS.some(x => x.id === mod)) {
        result.push(mod);
      }
    }

    return result;
  }

  setCurrentTurnIndex() {
    // Not implemented — Civ7 save write-back is TBD. Most handlers skip a player
    // by setting their type to AI; that also needs write support here.
  }

  cleanupSave() {
    // Flush any names set via civData[].playerName into the save (for the
    // companion mod to show on the hotseat curtain) — one batched recompress.
    if (Object.keys(this.pendingNames).length) {
      this.rawSave = setPydtPlayerNames(this.rawSave, this.pendingNames);
    }
  }

  getData(): Buffer {
    return this.rawSave;
  }
}
