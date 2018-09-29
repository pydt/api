import { SaveHandler } from './saveHandler';
import { Civ6SaveHandler } from './civ6SaveHandler';
import { Game } from '../models';

export abstract class SaveHandlerFactory {
  public static getHandler(data: Buffer, game: Game): SaveHandler {
    // TODO: check for game type...
    return new Civ6SaveHandler(data);
  }
}
