import * as civ5 from 'pydt-civ5-save-parser';
import { BEYOND_EARTH_DLCS } from '../metadata/civGames/beyondEarth';
import { CIV5_DLCS } from '../metadata/civGames/civ5';
import { ActorType, CivData, SaveHandler } from './saveHandler';

const ACTOR_TYPE_MAP = [
  { intVal: 1, actorType: ActorType.AI },
  { intVal: 2, actorType: ActorType.DEAD },
  { intVal: 3, actorType: ActorType.HUMAN }
];

export class Civ5CivData implements CivData {
  constructor(private civ, private index: number, private handler: Civ5SaveHandler) {}

  get type() {
    return ACTOR_TYPE_MAP.find(x => x.intVal === this.civ.type).actorType;
  }

  set type(value: ActorType) {
    this.handler.rawSave = civ5.changeCivType(this.handler.rawSave, this.index, ACTOR_TYPE_MAP.find(x => x.actorType === value).intVal);
    this.handler.reparse();
  }

  get playerName() {
    return this.civ.playerName;
  }

  set playerName(value: string) {
    this.handler.rawSave = civ5.changePlayerName(this.handler.rawSave, this.index, value || '');
    this.handler.reparse();
  }

  get leaderName() {
    return this.civ.leader;
  }

  get isCurrentTurn(): boolean {
    return this.handler.parsed.player === this.index;
  }

  get password() {
    return this.civ.password;
  }

  set password(value: string) {
    this.handler.rawSave = civ5.changeCivPassword(this.handler.rawSave, this.index, value || '');
    this.handler.reparse();
  }
}

export class Civ5SaveHandler implements SaveHandler {
  rawSave;
  parsed;
  civData: CivData[] = [];

  constructor(data: Buffer) {
    this.rawSave = data;
    this.reparse();
  }

  reparse() {
    this.parsed = civ5.parse(this.rawSave);
    this.civData = this.parsed.civilizations
      .filter(x => x.leader !== 'LEADER_BARBARIAN' && x.leader !== 'LEADER_ALIEN')
      .map((civ, i) => new Civ5CivData(civ, i, this));
  }

  get gameTurn() {
    return this.parsed.turn;
  }

  get gameSpeed() {
    return this.parsed.gameSpeed;
  }

  get mapFile() {
    return this.parsed.mapScript;
  }

  get mapSize() {
    return this.parsed.worldSize;
  }

  get parsedDlcs() {
    const result = [];

    for (const mod of this.parsed.mods) {
      const dlc = this.parsed.civ === 'CIVBE' ? BEYOND_EARTH_DLCS : CIV5_DLCS;
      if (dlc.some(x => x.id === mod.id)) {
        result.push(mod.id);
      }
    }

    return result;
  }

  setCurrentTurnIndex(newIndex: number) {
    this.rawSave = civ5.changePlayer(this.rawSave, newIndex);
    this.reparse();
  }

  getData(): Buffer {
    return this.rawSave;
  }
}
