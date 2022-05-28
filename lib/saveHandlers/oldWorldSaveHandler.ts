import { ActorType, CivData, SaveHandler } from './saveHandler';
import * as AdmZip from 'adm-zip';
import { xml2js, js2xml } from 'xml-js';
import { HttpResponseError } from './../../api/framework/httpResponseError';

const AI_CONTROLLED_TURN = '99999999';

export class OldWorldCivData implements CivData {
  constructor(private root, private playerData, private index: number) {}

  get isReallyHuman() {
    return this.root.elements
      .find(x => x.name === 'Humans')
      .elements.filter(x => x.name === 'PlayerHuman')
      .some(x => +x.elements[0].text === this.index);
  }

  get type() {
    if (!this.isReallyHuman) {
      return ActorType.AI;
    }

    if (this.playerData.attributes.AIControlledToTurn === AI_CONTROLLED_TURN) {
      return ActorType.AI;
    }

    if (this.playerData.elements.find(x => x.name === 'Dead')) {
      return ActorType.DEAD;
    }

    return ActorType.HUMAN;
  }

  set type(value: ActorType) {
    if (this.isReallyHuman) {
      this.playerData.attributes.AIControlledToTurn =
        value === ActorType.AI ? AI_CONTROLLED_TURN : '0';
    }
  }

  get playerName() {
    return this.playerData.attributes.Name;
  }

  set playerName(value: string) {
    this.playerData.attributes.Name = value;
  }

  get leaderName() {
    return this.playerData.attributes.Nation;
  }

  get isCurrentTurn() {
    return (
      +this.root.elements.find(x => x.name === 'Game').elements.find(x => x.name === 'PlayerTurn')
        .elements[0].text === this.index
    );
  }

  get password() {
    // No password needed, mod enforces like password normally would
    return '';
  }

  set password(value: string) {
    // No password needed, mod enforces like password normally would
  }
}

export class OldWorldSaveHandler implements SaveHandler {
  private saveData;

  constructor(data: Buffer) {
    const zip = new AdmZip(data);
    const entries = zip.getEntries();
    this.saveData = xml2js(entries[0].getData().toString('utf-8'));

    if (this.root.attributes.Version.indexOf('Play-Your-Damn-Turn-Support') < 0) {
      throw new HttpResponseError(
        400,
        `To play Old World, the "Play Your Damn Turn Support" mod must be enabled!`
      );
    }
  }

  get root() {
    return this.saveData.elements[0];
  }

  get civData(): CivData[] {
    return this.root.elements
      .filter(x => x.name === 'Player')
      .map((p, i) => new OldWorldCivData(this.root, p, i));
  }

  get gameSpeed(): string {
    return ''; // Doesn't seem to be a setting in the UI?
  }

  get gameTurn(): number {
    return +this.root.elements.find(x => x.name === 'Game').elements.find(x => x.name === 'Turn')
      .elements[0].text;
  }

  get mapFile(): string {
    return this.root.attributes.MapClass;
  }

  get mapSize(): string {
    return this.root.attributes.MapSize;
  }

  get parsedDlcs(): string[] {
    return [];
  }

  setCurrentTurnIndex() {
    // Not implemented...
  }

  getData(): Buffer {
    const zip = new AdmZip();
    zip.addFile(
      `Turn${this.gameTurn}.xml`,
      Buffer.from(
        js2xml(this.saveData, {
          spaces: 1
        })
      )
    );
    return zip.toBuffer();
  }
}
