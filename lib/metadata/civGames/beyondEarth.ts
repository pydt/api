import { GameStore, Platform } from 'pydt-shared-models';
import { BasePath, CivDefFactory, CivGame, DlcFactory, GameSpeedFactory, MapFactory, MapSizeFactory, RANDOM_CIV } from '../civGame';

export const BEYOND_EARTH_DLCS = [
  DlcFactory('54df493fb668d144a930a168628faa59', 'Exoplanets Map Pack'),
  DlcFactory('57b2d25491c545408f17a69f033166c7', 'Rising Tide', true)
];

const ASSET_PREFIX = 'BEYOND_EARTH_';

export const BEYOND_EARTH_LEADERS = [
  RANDOM_CIV,
  CivDefFactory('CIVILIZATION_ARC', 'LEADER_ARC', ASSET_PREFIX, {
    leaderDisplayName: 'American Reclamation Corporation',
    justShowLeaderName: true
  }),
  CivDefFactory('CIVILIZATION_AFRICAN_UNION', 'LEADER_AFRICAN_UNION', ASSET_PREFIX, {
    leaderDisplayName: "People's African Union",
    justShowLeaderName: true
  }),
  CivDefFactory('CIVILIZATION_BRASILIA', 'LEADER_BRASILIA', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('CIVILIZATION_PAN_ASIA', 'LEADER_PAN_ASIA', ASSET_PREFIX, {
    leaderDisplayName: 'Pan-Asian Cooperative',
    justShowLeaderName: true
  }),
  CivDefFactory('CIVILIZATION_FRANCO_IBERIA', 'LEADER_FRANCO_IBERIA', ASSET_PREFIX, {
    leaderDisplayName: 'Franco-Iberia',
    justShowLeaderName: true
  }),
  CivDefFactory('CIVILIZATION_KAVITHAN', 'LEADER_INDIA', ASSET_PREFIX, {
    leaderDisplayName: 'Kavithan Protectorate',
    justShowLeaderName: true
  }),
  CivDefFactory('CIVILIZATION_POLYSTRALIA', 'LEADER_POLYSTRALIA', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('CIVILIZATION_RUSSIA', 'LEADER_RUSSIA', ASSET_PREFIX, {
    leaderDisplayName: 'Slavic Federation',
    justShowLeaderName: true
  }),
  CivDefFactory('CIVILIZATION_AL_FALAH', 'LEADER_AL_FALAH', ASSET_PREFIX, {
    dlcId: '57b2d25491c545408f17a69f033166c7',
    justShowLeaderName: true
  }),
  CivDefFactory('CIVILIZATION_NORTH_SEA_ALLIANCE', 'LEADER_NORTH_SEA_ALLIANCE', ASSET_PREFIX, {
    dlcId: '57b2d25491c545408f17a69f033166c7',
    justShowLeaderName: true
  }),
  CivDefFactory('CIVILIZATION_INTEGR', 'LEADER_INTEGR', ASSET_PREFIX, {
    leaderDisplayName: 'INTEGR',
    dlcId: '57b2d25491c545408f17a69f033166c7',
    justShowLeaderName: true
  }),
  CivDefFactory('CIVILIZATION_CHUNGSU', 'LEADER_CHUNGSU', ASSET_PREFIX, {
    dlcId: '57b2d25491c545408f17a69f033166c7',
    justShowLeaderName: true
  })
];

export const BEYOND_EARTH_GAME_SPEEDS = [
  GameSpeedFactory('GAMESPEED_QUICK', 'Quick'),
  GameSpeedFactory('GAMESPEED_STANDARD', 'Standard'),
  GameSpeedFactory('GAMESPEED_EPIC', 'Epic'),
  GameSpeedFactory('GAMESPEED_MARATHON', 'Marathon')
];

export const BEYOND_EARTH_MAP_SIZES = [
  MapSizeFactory('WORLDSIZE_DUEL', 'Duel', 2),
  MapSizeFactory('WORLDSIZE_TINY', 'Tiny', 4),
  MapSizeFactory('WORLDSIZE_SMALL', 'Small', 6),
  MapSizeFactory('WORLDSIZE_STANDARD', 'Standard', 8),
  MapSizeFactory('WORLDSIZE_LARGE', 'Massive', 8)
];

export const BEYOND_EARTH_MAPS = [MapFactory('Assets\\Maps\\Protean.lua', 'Protean')];

export const BEYOND_EARTH_GAME: CivGame = {
  id: 'BEYOND_EARTH',
  displayName: 'Beyond Earth',
  turnTimerSupported: true,
  assetPrefix: 'BEYOND_EARTH_',
  dlcs: BEYOND_EARTH_DLCS,
  gameSpeeds: BEYOND_EARTH_GAME_SPEEDS,
  leaders: BEYOND_EARTH_LEADERS,
  maps: BEYOND_EARTH_MAPS,
  mapSizes: BEYOND_EARTH_MAP_SIZES,
  saveLocations: {
    [Platform.Windows]: { basePath: BasePath.DOCUMENTS, prefix: '/My Games' },
    [Platform.OSX]: { basePath: BasePath.APP_DATA, prefix: '' },
    [Platform.Linux]: { basePath: BasePath.HOME, prefix: '/.local/share/aspyr-media' }
  },
  dataPaths: {
    [GameStore.Steam]: "/Sid Meier's Civilization Beyond Earth"
  },
  savePath: '/Saves/hotseat/',
  saveExtension: 'CivBESave',
  runUrls: {
    [GameStore.Steam]: 'steam://run/65980/\\dx11'
  }
};
