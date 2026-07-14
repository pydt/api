import { GameStore, Platform } from 'pydt-shared-models';
import {
  BasePath,
  CivDef,
  CivDefFactory,
  CivDefOptions,
  CivGame,
  CivOnlyDefFactory,
  createProtonPath,
  defaultDisplayName,
  DlcFactory,
  DlcGroupFactory,
  GameSpeedFactory,
  MapSizeFactory,
  RANDOM_CIV,
  RANDOM_CIVILIZATION
} from '../civGame';

export const CIV7_DLCS = [
  DlcFactory('ada-lovelace', 'Ada Lovelace'),
  DlcFactory('assyria', 'Assyria'),
  DlcFactory('bulgaria', 'Bulgaria'),
  DlcFactory('carthage', 'Carthage'),
  DlcFactory('mountain-natural-wonders', 'Collection 1: Natural Wonder Pack'),
  DlcFactory('asia-wonders', 'Collection 2: Asia Wonder Pack'),
  DlcFactory('water-wonders', 'Collection 3: Water Wonder Pack'),
  DlcFactory('dai-viet', 'Đại Việt'),
  DlcFactory('edward-teach', 'Edward Teach'),
  DlcFactory('genghis-khan', 'Genghis Khan'),
  DlcFactory('great-britain', 'Great Britain'),
  DlcFactory('iceland', 'Iceland'),
  DlcFactory('lakshmibai', 'Lakshmibai'),
  DlcFactory('napoleon', 'Napoleon'),
  DlcFactory('nepal', 'Nepal'),
  DlcFactory('ottomans', 'Ottomans'),
  DlcFactory('ashoka-himiko-alt', 'Persona Pack - Ashoka and Himiko'),
  DlcFactory('friedrich-xerxes-alt', 'Persona Pack - Friedrich and Xerxes'),
  DlcFactory('napoleon-alt', 'Persona Pack - Napoleon'),
  DlcFactory('qajar', 'Qajar'),
  DlcFactory('pirate-republic', 'Republic of Pirates'),
  DlcFactory('sayyida-al-hurra', 'Sayyida al Hurra'),
  DlcFactory('shawnee-tecumseh', 'Shawnee / Tecumseh'),
  DlcFactory('silla', 'Silla'),
  DlcFactory('bolivar', 'Simón Bolívar'),
  DlcFactory('tonga', 'Tonga')
];

export const CIV7_DLC_GROUPS = [
  DlcGroupFactory('initial-launch', 'Initial Launch DLC', [
    'napoleon',
    'ashoka-himiko-alt',
    'friedrich-xerxes-alt',
    'napoleon-alt',
    'shawnee-tecumseh'
  ]),
  DlcGroupFactory('cotw', 'Crossroads of the World', [
    'ada-lovelace',
    'bulgaria',
    'carthage',
    'mountain-natural-wonders',
    'great-britain',
    'nepal',
    'bolivar'
  ]),
  DlcGroupFactory('rtr', 'Right to Rule', [
    'assyria',
    'asia-wonders',
    'dai-viet',
    'genghis-khan',
    'lakshmibai',
    'qajar',
    'silla'
  ]),
  DlcGroupFactory('top', 'Tides of Power', [
    'water-wonders',
    'edward-teach',
    'iceland',
    'ottomans',
    'pirate-republic',
    'sayyida-al-hurra',
    'tonga'
  ])
];

const ASSET_PREFIX = 'CIV7_';

export const CIV7_LEADERS = [
  RANDOM_CIV,
  CivDefFactory('LEADER_ADA_LOVELACE', 'LEADER_ADA_LOVELACE', ASSET_PREFIX, {
    justShowLeaderName: true,
    dlcId: 'ada-lovelace'
  }),
  CivDefFactory('LEADER_ALEXANDER', 'LEADER_ALEXANDER', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_AMINA', 'LEADER_AMINA', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_ASHOKA', 'LEADER_ASHOKA', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Ashoka, World Renouncer'
  }),
  CivDefFactory('LEADER_ASHOKA_ALT', 'LEADER_ASHOKA_ALT', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Ashoka, World Conqueror',
    dlcId: 'ashoka-himiko-alt'
  }),
  CivDefFactory('LEADER_AUGUSTUS', 'LEADER_AUGUSTUS', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_BENJAMIN_FRANKLIN', 'LEADER_BENJAMIN_FRANKLIN', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_BOLIVAR', 'LEADER_BOLIVAR', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Simón Bolívar',
    dlcId: 'bolivar'
  }),
  CivDefFactory('LEADER_CATHERINE', 'LEADER_CATHERINE', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Catherine the Great'
  }),
  CivDefFactory('LEADER_CHARLEMAGNE', 'LEADER_CHARLEMAGNE', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_CONFUCIUS', 'LEADER_CONFUCIUS', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_EDWARD_TEACH', 'LEADER_EDWARD_TEACH', ASSET_PREFIX, {
    justShowLeaderName: true,
    dlcId: 'edward-teach'
  }),
  CivDefFactory('LEADER_FRIEDRICH', 'LEADER_FRIEDRICH', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Friedrich, Oblique'
  }),
  CivDefFactory('LEADER_FRIEDRICH_ALT', 'LEADER_FRIEDRICH_ALT', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Friedrich, Baroque',
    dlcId: 'friedrich-xerxes-alt'
  }),
  CivDefFactory('LEADER_GENGHIS_KHAN', 'LEADER_GENGHIS_KHAN', ASSET_PREFIX, {
    justShowLeaderName: true,
    dlcId: 'genghis-khan'
  }),
  CivDefFactory('LEADER_GILGAMESH', 'LEADER_GILGAMESH', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_HARRIET_TUBMAN', 'LEADER_HARRIET_TUBMAN', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_HATSHEPSUT', 'LEADER_HATSHEPSUT', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_HIMIKO', 'LEADER_HIMIKO', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Himiko, Queen of Wa'
  }),
  CivDefFactory('LEADER_HIMIKO_ALT', 'LEADER_HIMIKO_ALT', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Himiko, High Shaman',
    dlcId: 'ashoka-himiko-alt'
  }),
  CivDefFactory('LEADER_IBN_BATTUTA', 'LEADER_IBN_BATTUTA', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_ISABELLA', 'LEADER_ISABELLA', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_JOSE_RIZAL', 'LEADER_JOSE_RIZAL', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_LAFAYETTE', 'LEADER_LAFAYETTE', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_LAKSHMIBAI', 'LEADER_LAKSHMIBAI', ASSET_PREFIX, {
    justShowLeaderName: true,
    dlcId: 'lakshmibai'
  }),
  CivDefFactory('LEADER_MACHIAVELLI', 'LEADER_MACHIAVELLI', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_NAPOLEON', 'LEADER_NAPOLEON', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Napoleon, Emporer',
    dlcId: 'napoleon'
  }),
  CivDefFactory('LEADER_NAPOLEON_ALT', 'LEADER_NAPOLEON_ALT', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Napoleon, Revolutionary',
    dlcId: 'napoleon-alt'
  }),
  CivDefFactory('LEADER_PACHACUTI', 'LEADER_PACHACUTI', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_SAYYIDA_AL_HURRA', 'LEADER_SAYYIDA_AL_HURRA', ASSET_PREFIX, {
    justShowLeaderName: true,
    dlcId: 'sayyida-al-hurra'
  }),
  CivDefFactory('LEADER_TECUMSEH', 'LEADER_TECUMSEH', ASSET_PREFIX, {
    justShowLeaderName: true,
    dlcId: 'shawnee-tecumseh'
  }),
  CivDefFactory('LEADER_TRUNG_TRAC', 'LEADER_TRUNG_TRAC', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_XERXES', 'LEADER_XERXES', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Xerxes, King of Kings'
  }),
  CivDefFactory('LEADER_XERXES_ALT', 'LEADER_XERXES_ALT', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Xerxes, the Achaemenid',
    dlcId: 'friedrich-xerxes-alt'
  })
];

export const CIV7_GAME_SPEEDS = [
  GameSpeedFactory('GAMESPEED_ONLINE', 'Online'),
  GameSpeedFactory('GAMESPEED_QUICK', 'Quick'),
  GameSpeedFactory('GAMESPEED_STANDARD', 'Standard'),
  GameSpeedFactory('GAMESPEED_EPIC', 'Epic'),
  GameSpeedFactory('GAMESPEED_MARATHON', 'Marathon')
];

export const CIV7_MAP_SIZES = [
  MapSizeFactory('MAPSIZE_TINY', 'Tiny', 4),
  MapSizeFactory('MAPSIZE_SMALL', 'Small', 6),
  MapSizeFactory('MAPSIZE_STANDARD', 'Standard', 8),
  MapSizeFactory('MAPSIZE_LARGE', 'Large', 10),
  MapSizeFactory('MAPSIZE_HUGE', 'Huge', 12)
];

export const CIV7_MAPS = [];

function AntiquityCiv(civKey: string, options: CivDefOptions = {}): CivDef {
  const civDisplayName = options.civDisplayName || defaultDisplayName(civKey);

  return CivOnlyDefFactory(civKey, ASSET_PREFIX, {
    ...options,
    civDisplayName: `${civDisplayName} (Antiquity)`
  });
}

function ExplorationCiv(civKey: string, options: CivDefOptions = {}): CivDef {
  const civDisplayName = options.civDisplayName || defaultDisplayName(civKey);

  return CivOnlyDefFactory(civKey, ASSET_PREFIX, {
    ...options,
    civDisplayName: `${civDisplayName} (Exploration)`
  });
}

function ModernCiv(civKey: string, options: CivDefOptions = {}): CivDef {
  const civDisplayName = options.civDisplayName || defaultDisplayName(civKey);

  return CivOnlyDefFactory(civKey, ASSET_PREFIX, {
    ...options,
    civDisplayName: `${civDisplayName} (Modern)`
  });
}

export const CIV7_CIVS = [
  RANDOM_CIVILIZATION,
  // Antiquity Age
  AntiquityCiv('CIVILIZATION_PERSIA', { civDisplayName: 'Achaemenid Persian' }),
  AntiquityCiv('CIVILIZATION_AKSUM'),
  AntiquityCiv('CIVILIZATION_ASSYRIA', { dlcId: 'assyria' }),
  AntiquityCiv('CIVILIZATION_CARTHAGE', {
    dlcId: 'carthage'
  }),
  AntiquityCiv('CIVILIZATION_EGYPT'),
  AntiquityCiv('CIVILIZATION_GREECE'),
  AntiquityCiv('CIVILIZATION_HAN'),
  AntiquityCiv('CIVILIZATION_KHMER'),
  AntiquityCiv('CIVILIZATION_MAURYA'),
  AntiquityCiv('CIVILIZATION_MAYA'),
  AntiquityCiv('CIVILIZATION_MISSISSIPPIAN'),
  AntiquityCiv('CIVILIZATION_ROME'),
  AntiquityCiv('CIVILIZATION_SILLA', { dlcId: 'silla' }),
  AntiquityCiv('CIVILIZATION_TONGA', { dlcId: 'tonga' }),
  // Exploration Age
  ExplorationCiv('CIVILIZATION_ABBASID'),
  ExplorationCiv('CIVILIZATION_BULGARIA', {
    dlcId: 'bulgaria'
  }),
  ExplorationCiv('CIVILIZATION_CHOLA'),
  ExplorationCiv('CIVILIZATION_HAWAII'),
  ExplorationCiv('CIVILIZATION_ICELAND', { dlcId: 'iceland' }),
  ExplorationCiv('CIVILIZATION_INCA'),
  ExplorationCiv('CIVILIZATION_MAJAPAHIT'),
  ExplorationCiv('CIVILIZATION_MING'),
  ExplorationCiv('CIVILIZATION_MONGOLIA'),
  ExplorationCiv('CIVILIZATION_NORMAN'),
  ExplorationCiv('CIVILIZATION_PIRATE_REPUBLIC', {
    civDisplayName: 'Republic of Pirates',
    dlcId: 'pirate-republic'
  }),
  ExplorationCiv('CIVILIZATION_SHAWNEE', { dlcId: 'shawnee-tecumseh' }),
  ExplorationCiv('CIVILIZATION_SONGHAI'),
  ExplorationCiv('CIVILIZATION_SPAIN'),
  ExplorationCiv('CIVILIZATION_DAI_VIET', { civDisplayName: 'Đại Việt', dlcId: 'dai-viet' }),
  // Modern Age
  ModernCiv('CIVILIZATION_AMERICA'),
  ModernCiv('CIVILIZATION_GREAT_BRITAIN', {
    dlcId: 'great-britain'
  }),
  ModernCiv('CIVILIZATION_BUGANDA'),
  ModernCiv('CIVILIZATION_FRENCH_EMPIRE'),
  ModernCiv('CIVILIZATION_MEIJI', { civDisplayName: 'Meiji Japanese' }),
  ModernCiv('CIVILIZATION_MEXICO'),
  ModernCiv('CIVILIZATION_MUGHAL'),
  ModernCiv('CIVILIZATION_NEPAL', {
    dlcId: 'nepal'
  }),
  ModernCiv('CIVILIZATION_OTTOMANS', { dlcId: 'ottomans' }),
  ModernCiv('CIVILIZATION_PRUSSIA'),
  ModernCiv('CIVILIZATION_QAJAR', { dlcId: 'qajar' }),
  ModernCiv('CIVILIZATION_QING'),
  ModernCiv('CIVILIZATION_RUSSIA'),
  ModernCiv('CIVILIZATION_SIAM')
];

export const CIV7_GAME: CivGame = {
  id: 'CIV7',
  displayName: 'Civilization 7 (Beta)',
  turnTimerSupported: true,
  assetPrefix: ASSET_PREFIX,
  separateLeaderCiv: true,
  dlcs: CIV7_DLCS,
  dlcGroups: CIV7_DLC_GROUPS,
  gameSpeeds: CIV7_GAME_SPEEDS,
  leaders: CIV7_LEADERS,
  civilizations: CIV7_CIVS,
  maps: CIV7_MAPS,
  mapSizes: CIV7_MAP_SIZES,
  saveLocations: {
    [Platform.Windows]: { basePath: BasePath.DOCUMENTS, prefix: '/My Games' },
    [Platform.OSX]: {
      basePath: BasePath.APP_DATA,
      prefix: '',
      dataPathOverrides: {
        [GameStore.Steam]: '/Civilization VII'
      }
    },
    [Platform.Linux]: { basePath: BasePath.HOME, prefix: '/.local/share/aspyr-media' },
    [Platform.LinuxProton]: { basePath: BasePath.HOME, prefix: createProtonPath('1295660') }
  },
  dataPaths: {
    [GameStore.Steam]: "/Sid Meier's Civilization VII"
  },
  savePath: '/Saves/Hotseat/',
  saveExtension: 'Civ7Save',
  runUrls: {
    [GameStore.Steam]: 'steam://run/1295660/\\dx12'
  },
  awaitWriteFinish: false
};
