import * as civ7 from 'civ7-save-parser';
import { ActorType, CivData, SaveHandler } from './saveHandler';
import { CIV7_DLCS } from '../metadata/civGames/civ7';
import { orderBy } from 'lodash';

/**
 * Whose-turn is not readable from a Civ7 save in any stable way (it lives only in
 * the compressed, hash-keyed game state — see the civ7-save-parser REVERSING.md).
 * Instead, the PYDT companion mod stamps it in on turn end via
 * `GameTutorial.setProperty("PYDT", "PYDT_TURN|player=<localPlayerID>|turn=<n>")`,
 * which persists as a plain UTF-8 chunk inside the compressed blob. We decompress
 * and match our own prefix — no reverse-engineering of the proprietary format.
 */
interface PydtTurnData {
  currentPlayer?: number;
  turn?: number;
  fields: Record<string, string>;
}

function parsePydtTurnData(data: Buffer): PydtTurnData | undefined {
  const decompressed = civ7.decompress(data);

  if (!decompressed) {
    return undefined;
  }

  // The value is a null-terminated UTF-8 string chunk; capture up to the null.
  const match = decompressed.toString('latin1').match(/PYDT_TURN\|([^\0]*)/);

  if (!match) {
    return undefined;
  }

  const fields: Record<string, string> = {};
  for (const part of match[1].split('|')) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      fields[part.slice(0, eq)] = part.slice(eq + 1);
    }
  }

  const num = (value?: string) =>
    value !== undefined && /^\d+$/.test(value) ? Number(value) : undefined;

  return { currentPlayer: num(fields.player), turn: num(fields.turn), fields };
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

  get isCurrentTurn(): boolean {
    // Sourced from the PYDT companion mod's stamped property (see above). If the
    // mod isn't installed / hasn't stamped the save, this is always false.
    return this.handler.pydtTurnData?.currentPlayer === this.player.id;
  }

  set isCurrentTurn(_value: boolean) {
    // Not implemented
  }

  // Not available from a Civ7 save yet (would require decoding the compressed
  // player records and/or write-back support). Returns undefined, like Civ6 does
  // for civs without a stored player name / password.
  get playerName() {
    return this.player.playerName;
  }

  set playerName(_value: string) {
    // Not implemented - no way to set this i can see?
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
    // Not implemented.
  }

  getData(): Buffer {
    return this.rawSave;
  }
}
