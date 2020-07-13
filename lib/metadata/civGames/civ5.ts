import { GameStore, Platform } from 'pydt-shared-models';
import { BasePath, CivDefFactory, CivGame, DlcFactory, GameSpeedFactory, MapFactory, MapSizeFactory, RANDOM_CIV } from '../civGame';

export const CIV5_DLCS = [
  DlcFactory('e31e3c297611f644ac1f59663826de74', 'Mongolia'),
  DlcFactory('ded585b6ca7c754e81b42f60754e6330', 'Spain and Inca'),
  DlcFactory('05c6f7ec11baac4c8d80d71306aac471', 'Polynesia'),
  DlcFactory('390d03b3d8c0c74b91b17ad1caf585ab', 'Denmark'),
  DlcFactory('b2222c110853b642b734171ccab3037b', 'Korea'),
  DlcFactory('32ba59746457ae448e9501ad0e0efd48', 'Babylon'),
  DlcFactory('a151370e40f81b4e9706519bf484e59d', 'Expansion - Gods and Kings', true),
  DlcFactory('3676a06d23411840b6436575b4ec336b', 'Expansion - Brave New World', true)
];

const ASSET_PREFIX = 'CIV5_';

export const CIV5_LEADERS = [
  RANDOM_CIV,
  CivDefFactory('CIVILIZATION_AMERICA', 'LEADER_WASHINGTON', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_ARABIA', 'LEADER_HARUN_AL_RASHID', ASSET_PREFIX, {
    leaderDisplayName: 'Harun al-Rashid'
  }),
  CivDefFactory('CIVILIZATION_ASSYRIA', 'LEADER_ASHURBANIPAL', ASSET_PREFIX, {
    dlcId: '3676a06d23411840b6436575b4ec336b'
  }),
  CivDefFactory('CIVILIZATION_AUSTRIA', 'LEADER_MARIA', ASSET_PREFIX, {
    leaderDisplayName: 'Maria Theresa',
    dlcId: 'a151370e40f81b4e9706519bf484e59d'
  }),
  CivDefFactory('CIVILIZATION_AZTEC', 'LEADER_MONTEZUMA', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_BABYLON', 'LEADER_NEBUCHADNEZZAR', ASSET_PREFIX, {
    leaderDisplayName: 'Nebuchadnezzar II',
    dlcId: '32ba59746457ae448e9501ad0e0efd48'
  }),
  CivDefFactory('CIVILIZATION_BRAZIL', 'LEADER_PEDRO', ASSET_PREFIX, {
    leaderDisplayName: 'Pedro II',
    dlcId: '3676a06d23411840b6436575b4ec336b'
  }),
  CivDefFactory('CIVILIZATION_BYZANTIUM', 'LEADER_THEODORA', ASSET_PREFIX, {
    dlcId: 'a151370e40f81b4e9706519bf484e59d'
  }),
  CivDefFactory('CIVILIZATION_CARTHAGE', 'LEADER_DIDO', ASSET_PREFIX, {
    dlcId: 'a151370e40f81b4e9706519bf484e59d'
  }),
  CivDefFactory('CIVILIZATION_CELTS', 'LEADER_BOUDICCA', ASSET_PREFIX, {
    dlcId: 'a151370e40f81b4e9706519bf484e59d'
  }),
  CivDefFactory('CIVILIZATION_CHINA', 'LEADER_WU_ZETIAN', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_DENMARK', 'LEADER_HARALD', ASSET_PREFIX, {
    leaderDisplayName: 'Harald Bluetooth',
    dlcId: '390d03b3d8c0c74b91b17ad1caf585ab'
  }),
  CivDefFactory('CIVILIZATION_EGYPT', 'LEADER_RAMESSES', ASSET_PREFIX, {
    leaderDisplayName: 'Ramesses II'
  }),
  CivDefFactory('CIVILIZATION_ENGLAND', 'LEADER_ELIZABETH', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_ETHIOPIA', 'LEADER_SELASSIE', ASSET_PREFIX, {
    leaderDisplayName: 'Haile Selassie',
    dlcId: 'a151370e40f81b4e9706519bf484e59d'
  }),
  CivDefFactory('CIVILIZATION_FRANCE', 'LEADER_NAPOLEON', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_GERMANY', 'LEADER_BISMARCK', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_GREECE', 'LEADER_ALEXANDER', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_HUNS', 'LEADER_ATTILA', ASSET_PREFIX, {
    dlcId: 'a151370e40f81b4e9706519bf484e59d'
  }),
  CivDefFactory('CIVILIZATION_INCA', 'LEADER_PACHACUTI', ASSET_PREFIX, {
    dlcId: 'ded585b6ca7c754e81b42f60754e6330'
  }),
  CivDefFactory('CIVILIZATION_INDIA', 'LEADER_GANDHI', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_INDONESIA', 'LEADER_GAJAH_MADA', ASSET_PREFIX, {
    dlcId: '3676a06d23411840b6436575b4ec336b'
  }),
  CivDefFactory('CIVILIZATION_IROQUOIS', 'LEADER_HIAWATHA', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_JAPAN', 'LEADER_ODA_NOBUNAGA', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_KOREA', 'LEADER_SEJONG', ASSET_PREFIX, {
    dlcId: 'b2222c110853b642b734171ccab3037b'
  }),
  CivDefFactory('CIVILIZATION_MAYA', 'LEADER_PACAL', ASSET_PREFIX, {
    dlcId: 'a151370e40f81b4e9706519bf484e59d'
  }),
  CivDefFactory('CIVILIZATION_MONGOL', 'LEADER_GENGHIS_KHAN', ASSET_PREFIX, {
    dlcId: 'e31e3c297611f644ac1f59663826de74'
  }),
  CivDefFactory('CIVILIZATION_MOROCCO', 'LEADER_AHMAD_ALMANSUR', ASSET_PREFIX, {
    leaderDisplayName: 'Ahmad al-Mansur',
    dlcId: '3676a06d23411840b6436575b4ec336b'
  }),
  CivDefFactory('CIVILIZATION_NETHERLANDS', 'LEADER_WILLIAM', ASSET_PREFIX, {
    dlcId: 'a151370e40f81b4e9706519bf484e59d'
  }),
  CivDefFactory('CIVILIZATION_OTTOMAN', 'LEADER_SULEIMAN', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_PERSIA', 'LEADER_DARIUS', ASSET_PREFIX, {
    leaderDisplayName: 'Darius I'
  }),
  CivDefFactory('CIVILIZATION_POLAND', 'LEADER_CASIMIR', ASSET_PREFIX, {
    leaderDisplayName: 'Casimir III',
    dlcId: '3676a06d23411840b6436575b4ec336b'
  }),
  CivDefFactory('CIVILIZATION_POLYNESIA', 'LEADER_KAMEHAMEHA', ASSET_PREFIX, {
    dlcId: '05c6f7ec11baac4c8d80d71306aac471'
  }),
  CivDefFactory('CIVILIZATION_PORTUGAL', 'LEADER_MARIA_I', ASSET_PREFIX, {
    dlcId: '3676a06d23411840b6436575b4ec336b'
  }),
  CivDefFactory('CIVILIZATION_ROME', 'LEADER_AUGUSTUS', ASSET_PREFIX, {
    leaderDisplayName: 'Augustus Caesar'
  }),
  CivDefFactory('CIVILIZATION_RUSSIA', 'LEADER_CATHERINE', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_SHOSHONE', 'LEADER_POCATELLO', ASSET_PREFIX, {
    dlcId: '3676a06d23411840b6436575b4ec336b'
  }),
  CivDefFactory('CIVILIZATION_SIAM', 'LEADER_RAMKHAMHAENG', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_SPAIN', 'LEADER_ISABELLA', ASSET_PREFIX, {
    dlcId: 'ded585b6ca7c754e81b42f60754e6330'
  }),
  CivDefFactory('CIVILIZATION_SONGHAI', 'LEADER_ASKIA', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_SWEDEN', 'LEADER_GUSTAVUS_ADOLPHUS', ASSET_PREFIX, {
    dlcId: 'a151370e40f81b4e9706519bf484e59d'
  }),
  CivDefFactory('CIVILIZATION_VENICE', 'LEADER_ENRICO_DANDOLO', ASSET_PREFIX, {
    dlcId: '3676a06d23411840b6436575b4ec336b'
  }),
  CivDefFactory('CIVILIZATION_ZULU', 'LEADER_SHAKA', ASSET_PREFIX, {
    dlcId: '3676a06d23411840b6436575b4ec336b'
  })
];

export const CIV5_GAME_SPEEDS = [
  GameSpeedFactory('GAMESPEED_QUICK', 'Quick'),
  GameSpeedFactory('GAMESPEED_STANDARD', 'Standard'),
  GameSpeedFactory('GAMESPEED_EPIC', 'Epic'),
  GameSpeedFactory('GAMESPEED_MARATHON', 'Marathon')
];

export const CIV5_MAP_SIZES = [
  MapSizeFactory('WORLDSIZE_DUEL', 'Duel', 2),
  MapSizeFactory('WORLDSIZE_TINY', 'Tiny', 4),
  MapSizeFactory('WORLDSIZE_SMALL', 'Small', 6),
  MapSizeFactory('WORLDSIZE_STANDARD', 'Standard', 8),
  MapSizeFactory('WORLDSIZE_LARGE', 'Large', 10),
  MapSizeFactory('WORLDSIZE_HUGE', 'Huge', 12)
];

export const CIV5_MAPS = [MapFactory('Assets\\Maps\\Continents.lua', 'Continents')];

export const CIV5_GAME: CivGame = {
  id: 'CIV5',
  displayName: 'Civilization 5',
  turnTimerSupported: true,
  assetPrefix: ASSET_PREFIX,
  dlcs: CIV5_DLCS,
  gameSpeeds: CIV5_GAME_SPEEDS,
  leaders: CIV5_LEADERS,
  maps: CIV5_MAPS,
  mapSizes: CIV5_MAP_SIZES,
  saveLocations: {
    [Platform.Windows]: { basePath: BasePath.DOCUMENTS, prefix: '/My Games' },
    [Platform.OSX]: { basePath: BasePath.APP_DATA, prefix: '' },
    [Platform.Linux]: { basePath: BasePath.HOME, prefix: '/.local/share/Aspyr' }
  },
  dataPaths: {
    [GameStore.Steam]: "/Sid Meier's Civilization 5"
  },
  savePath: '/Saves/hotseat/',
  saveExtension: 'Civ5Save',
  runUrls: {
    [GameStore.Steam]: 'steam://run/8930/\\dx11'
  }
};
