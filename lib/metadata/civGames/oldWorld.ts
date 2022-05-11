import { GameStore, Platform } from 'pydt-shared-models';
import { BasePath, CivGame, RANDOM_CIV } from '../civGame';
import { CivDefFactory, MapSizeFactory, MapFactory } from './../civGame';

export const OLD_WORLD_DLCS = [];

const ASSET_PREFIX = 'OLD_WORLD_';

export const OLD_WORLD_LEADERS = [
  RANDOM_CIV,
  CivDefFactory('NATION_ASSYRIA', 'NATION_ASSYRIA', ASSET_PREFIX, {
    leaderDisplayName: 'Assyria',
    justShowLeaderName: true
  }),
  CivDefFactory('NATION_BABYLONIA', 'NATION_BABYLONIA', ASSET_PREFIX, {
    leaderDisplayName: 'Babylonia',
    justShowLeaderName: true
  }),
  CivDefFactory('NATION_CARTHAGE', 'NATION_CARTHAGE', ASSET_PREFIX, {
    leaderDisplayName: 'Carthage',
    justShowLeaderName: true
  }),
  CivDefFactory('NATION_EGYPT', 'NATION_EGYPT', ASSET_PREFIX, {
    leaderDisplayName: 'Egypt',
    justShowLeaderName: true
  }),
  CivDefFactory('NATION_GREECE', 'NATION_GREECE', ASSET_PREFIX, {
    leaderDisplayName: 'Greece',
    justShowLeaderName: true
  }),
  CivDefFactory('NATION_PERSIA', 'NATION_PERSIA', ASSET_PREFIX, {
    leaderDisplayName: 'Persia',
    justShowLeaderName: true
  }),
  CivDefFactory('NATION_ROME', 'NATION_ROME', ASSET_PREFIX, {
    leaderDisplayName: 'Rome',
    justShowLeaderName: true
  })
];

export const OLD_WORLD_GAME_SPEEDS = [];

export const OLD_WORLD_MAP_SIZES = [
  MapSizeFactory('MAPSIZE_DUEL', 'Duel', 3),
  MapSizeFactory('MAPSIZE_SMALL', 'Small', 4),
  MapSizeFactory('MAPSIZE_MEDIUM', 'Medium', 5),
  MapSizeFactory('MAPSIZE_LARGE', 'Large', 6),
  MapSizeFactory('MAPSIZE_HUGE', 'Huge', 7)
];

export const OLD_WORLD_MAPS = [
  MapFactory('MAPCLASS_CoastalRainBasin', 'Coastal Rain Basin'),
  MapFactory('MAPCLASS_MapScriptArchipelago', 'Archipelago'),
  MapFactory('MAPCLASS_AridPlateau', 'Arid Plateau'),
  MapFactory('MAPCLASS_MapScriptContinent', 'Continent'),
  MapFactory('MAPCLASS_MapScriptContinents', 'Multiple Continents'),
  MapFactory('MAPCLASS_MapScriptDisjunction', 'Disjunction'),
  MapFactory('MAPCLASS_MapScriptHardwoodForest', 'Hardwood Forest'),
  MapFactory('MAPCLASS_MapScriptInlandSea', 'Inland Sea'),
  MapFactory('MAPCLASS_MapScriptNorthernOcean', 'Northern Ocean'),
  MapFactory('MAPCLASS_MapScriptSeaside', 'Seaside')
];

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
    [Platform.Linux]: { basePath: BasePath.HOME, prefix: '/.local/share/pydt_unknown' }
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
