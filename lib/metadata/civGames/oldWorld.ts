import { GameStore, Platform } from 'pydt-shared-models';
import { BasePath, CivGame, RANDOM_CIV } from '../civGame';

export const OLD_WORLD_DLCS = [];

const ASSET_PREFIX = 'OLD_WORLD_';

export const OLD_WORLD_LEADERS = [RANDOM_CIV];

export const OLD_WORLD_GAME_SPEEDS = [];

export const OLD_WORLD_MAP_SIZES = [];

export const OLD_WORLD_MAPS = [];

export const OLD_WORLD_GAME: CivGame = {
  id: 'OLD_WORLD',
  displayName: 'Old World',
  turnTimerSupported: true,
  assetPrefix: ASSET_PREFIX,
  dlcs: OLD_WORLD_DLCS,
  gameSpeeds: OLD_WORLD_GAME_SPEEDS,
  leaders: OLD_WORLD_LEADERS,
  maps: OLD_WORLD_MAPS,
  mapSizes: OLD_WORLD_MAP_SIZES,
  saveLocations: {
    [Platform.Windows]: { basePath: BasePath.DOCUMENTS, prefix: '/My Games' },
    [Platform.OSX]: { basePath: BasePath.APP_DATA, prefix: '' },
    [Platform.Linux]: { basePath: BasePath.HOME, prefix: '/.local/share/Aspyr' }
  },
  dataPaths: {
    [GameStore.Epic]: '/OldWorld'
  },
  savePath: '/Saves/Multiplayer/',
  saveExtension: 'zip',
  runUrls: {
    [GameStore.Epic]: 'com.epicgames.launcher://apps/Nightjar?action=launch&silent=true'
  }
};
