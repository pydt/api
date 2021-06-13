import { ActorType, CivData, SaveHandler } from './saveHandler';
import * as AdmZip from 'adm-zip';
import { xml2js, js2xml } from 'xml-js';

export class OldWorldCivData implements CivData {
  constructor(private saveData, private playerData, private index: number) {}

  get type() {
    // TODO: Dead?
    return this.saveData.elements[0].elements
      .find(x => x.name === 'Humans')
      .elements.filter(x => x.name === 'PlayerHuman')
      .some(x => +x.elements[0].text === this.index)
      ? ActorType.HUMAN
      : ActorType.AI;
  }

  set type(value: ActorType) {
    // TODO
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
      +this.saveData.elements[0].elements.find(x => x.name === 'Game').elements.find(x => x.name === 'PlayerTurn').elements[0].text ===
      this.index
    );
  }

  get password() {
    // TODO: is there a password?
    return '';
  }

  set password(value: string) {
    //TODO
  }
}

export class OldWorldSaveHandler implements SaveHandler {
  private saveData;

  constructor(data: Buffer) {
    const zip = new AdmZip(data);
    const entries = zip.getEntries();
    this.saveData = xml2js(entries[0].getData().toString('utf-8'));
  }

  get civData(): CivData[] {
    return this.saveData.elements[0].elements.filter(x => x.name === 'Player').map((p, i) => new OldWorldCivData(this.saveData, p, i));
  }

  get gameSpeed(): string {
    return ''; // Doesn't seem to be a setting in the UI?
  }

  get gameTurn(): number {
    return +this.saveData.elements[0].elements.find(x => x.name === 'Game').elements.find(x => x.name === 'Turn').elements[0].text;
  }

  get mapFile(): string {
    return this.saveData.elements[0].attributes.MapClass;
  }

  get mapSize(): string {
    return this.saveData.elements[0].attributes.MapSize;
  }

  get parsedDlcs(): string[] {
    return [];
  }

  setCurrentTurnIndex(newIndex: number) {
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
