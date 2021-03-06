import { BEYOND_EARTH_GAME } from '../metadata/civGames/beyondEarth';
import { CIV5_GAME } from '../metadata/civGames/civ5';
import { CIV6_GAME } from '../metadata/civGames/civ6';
import { OLD_WORLD_GAME } from '../metadata/civGames/oldWorld';
import { Game } from '../models';
import { Civ5SaveHandler } from './civ5SaveHandler';
import { Civ6SaveHandler } from './civ6SaveHandler';
import { OldWorldSaveHandler } from './oldWorldSaveHandler';
import { SaveHandler } from './saveHandler';

export abstract class SaveHandlerFactory {
  public static getHandler(data: Buffer, game: Game): SaveHandler {
    switch (game.gameType) {
      case CIV6_GAME.id:
        return new Civ6SaveHandler(data);

      case CIV5_GAME.id:
      case BEYOND_EARTH_GAME.id:
        return new Civ5SaveHandler(data);

      case OLD_WORLD_GAME.id:
        return new OldWorldSaveHandler(data);
    }

    throw new Error('No handler for game type: ' + game.gameType);
  }
}
