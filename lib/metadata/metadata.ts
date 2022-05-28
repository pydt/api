import * as crypto from 'crypto';
import { CIV6_GAME } from './civGames/civ6';
import { CIV5_GAME } from './civGames/civ5';
import { BEYOND_EARTH_GAME } from './civGames/beyondEarth';
import { CivGame, CivDef, RANDOM_CIV } from './civGame';
import { OLD_WORLD_GAME } from './civGames/oldWorld';

export const PYDT_METADATA: PydtMetadata = {
  civGames: [CIV6_GAME, CIV5_GAME, BEYOND_EARTH_GAME, OLD_WORLD_GAME],
  randomCiv: RANDOM_CIV
};

export const PYDT_METADATA_HASH = crypto
  .createHash('md5')
  .update(JSON.stringify(PYDT_METADATA))
  .digest('hex');

export interface PydtMetadata {
  civGames: CivGame[];
  randomCiv: CivDef;
}
