import * as civ7 from 'civ7-save-parser';
import { ActorType, CivData, SaveHandler } from './saveHandler';
import { CIV7_DLCS } from '../metadata/civGames/civ7';
import { orderBy } from 'lodash';

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
}

// On-disk JSON shape (key names match what the companion mod writes)
interface PydtPayload {
  player?: number;
  turn?: number;
  names?: Record<string, string>;
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
      return { currentPlayer: payload.player, turn: payload.turn, names: payload.names };
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
    // PLAYER_TYPE: 3 = Human, 1 = AI. DEAD isn't detectable from the uncompressed
    // data yet (the alive flag lives in the compressed state), so a defeated
    // player still reads as AI/Human for now.
    const match = ACTOR_TYPE_MAP.find(x => x.intVal === this.player.playerType?.value);
    return match ? match.actorType : ActorType.AI;
  }

  set type(value: ActorType) {
    // Used for turn-skipping: flipping a player to AI makes the game play their
    // turn. PLAYER_TYPE is an in-place edit of the uncompressed group3 record
    // (confirmed to work in-game). DEAD can't be written.
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

  constructor(data: Buffer) {
    this.rawSave = data;
    this.reparse();
  }

  reparse() {
    this.parsed = civ7.parse(this.rawSave);
    this.pydtTurnData = parsePydtTurnData(this.rawSave);
    this.civData = orderBy(this.parsed.players, x => x.id).map(
      player => new Civ7CivData(player, this)
    );
  }

  get gameTurn() {
    return this.parsed.turn?.value;
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
