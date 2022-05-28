import * as civ6 from 'civ6-save-parser';
import { ActorType, CivData, SaveHandler } from './saveHandler';
import { CIV6_DLCS } from '../metadata/civGames/civ6';

const ACTOR_TYPE_MAP = [
  { intVal: 1, actorType: ActorType.AI },
  { intVal: 3, actorType: ActorType.HUMAN }
];

export class Civ6CivData implements CivData {
  constructor(private wrapper, private parsedCiv) {}

  get type() {
    if (this.parsedCiv.PLAYER_ALIVE && !this.parsedCiv.PLAYER_ALIVE.data) {
      return ActorType.DEAD;
    }

    return ACTOR_TYPE_MAP.find(x => x.intVal === this.parsedCiv.ACTOR_AI_HUMAN.data).actorType;
  }

  set type(value: ActorType) {
    if (value === ActorType.DEAD) {
      throw new Error('Setting DEAD not supported');
    }

    const intVal = ACTOR_TYPE_MAP.find(x => x.actorType === value).intVal;
    this.setValue('ACTOR_AI_HUMAN', civ6.DATA_TYPES.INTEGER, intVal);
  }

  get playerName() {
    return (this.parsedCiv.PLAYER_NAME || {}).data;
  }

  set playerName(value: string) {
    this.setValue('PLAYER_NAME', civ6.DATA_TYPES.STRING, value);
  }

  get leaderName() {
    return this.parsedCiv.LEADER_NAME.data;
  }

  get isCurrentTurn() {
    return this.parsedCiv.IS_CURRENT_TURN && !!this.parsedCiv.IS_CURRENT_TURN.data;
  }

  get password() {
    return (this.parsedCiv.PLAYER_PASSWORD || {}).data;
  }

  set password(value: string) {
    this.setValue('PLAYER_PASSWORD', civ6.DATA_TYPES.STRING, value);
  }

  get slotHeaderVal() {
    return this.parsedCiv.SLOT_HEADER.data;
  }

  set slotHeaderVal(newVal: number) {
    civ6.modifyChunk(this.wrapper.chunks, this.parsedCiv.SLOT_HEADER, newVal);
  }

  private setValue(markerName, dataType, value) {
    if (this.parsedCiv[markerName]) {
      if (value) {
        civ6.modifyChunk(this.wrapper.chunks, this.parsedCiv[markerName], value);
      } else {
        civ6.deleteChunk(this.wrapper.chunks, this.parsedCiv[markerName]);
        this.slotHeaderVal--;
      }
    } else if (value) {
      civ6.addChunk(
        this.wrapper.chunks,
        this.parsedCiv.LEADER_NAME,
        civ6.MARKERS.ACTOR_DATA[markerName],
        dataType,
        value
      );

      this.slotHeaderVal++;
    }
  }
}

export class Civ6SaveHandler implements SaveHandler {
  private wrapper;
  civData: CivData[];

  constructor(data: Buffer) {
    this.wrapper = civ6.parse(data);
    this.civData = this.wrapper.parsed.CIVS.map(x => new Civ6CivData(this.wrapper, x));
  }

  get gameTurn() {
    return this.wrapper.parsed.GAME_TURN.data;
  }

  get gameSpeed() {
    return this.wrapper.parsed.GAME_SPEED.data;
  }

  get mapFile() {
    return this.wrapper.parsed.MAP_FILE.data;
  }

  get mapSize() {
    return this.wrapper.parsed.MAP_SIZE.data;
  }

  get parsedDlcs() {
    const result = [];

    if (this.wrapper.parsed.MOD_BLOCK_1) {
      for (const mod of this.wrapper.parsed.MOD_BLOCK_1.data) {
        if (CIV6_DLCS.some(x => x.id === mod.MOD_ID.data)) {
          result.push(mod.MOD_ID.data);
        }
      }
    }

    return result;
  }

  setCurrentTurnIndex() {
    // Not implemented...
  }

  getData() {
    return Buffer.concat(this.wrapper.chunks);
  }
}
