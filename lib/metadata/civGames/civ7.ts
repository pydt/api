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
  GameSpeedFactory,
  MapSizeFactory,
  RANDOM_CIV,
  RANDOM_CIVILIZATION
} from '../civGame';

export const CIV7_DLCS = [
  // For now, just singling out a single DLC in each of these packs to check for
  DlcFactory('napoleon', 'Initial Launch DLC'),
  DlcFactory('ada-lovelace', 'Crossroads of the World'),
  DlcFactory('genghis-khan', 'Right to Rule'),
  DlcFactory('edward-teach', 'Tides of Power')
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
    dlcId: 'napoleon'
  }),
  CivDefFactory('LEADER_AUGUSTUS', 'LEADER_AUGUSTUS', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_BENJAMIN_FRANKLIN', 'LEADER_BENJAMIN_FRANKLIN', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_BOLIVAR', 'LEADER_BOLIVAR', ASSET_PREFIX, {
    justShowLeaderName: true,
    leaderDisplayName: 'Simon Bolivar',
    dlcId: 'ada-lovelace'
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
    dlcId: 'napoleon'
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
    dlcId: 'napoleon'
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
    dlcId: 'genghis-khan'
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
    dlcId: 'napoleon'
  }),
  CivDefFactory('LEADER_PACHACUTI', 'LEADER_PACHACUTI', ASSET_PREFIX, {
    justShowLeaderName: true
  }),
  CivDefFactory('LEADER_SAYYIDA_AL_HURRA', 'LEADER_SAYYIDA_AL_HURRA', ASSET_PREFIX, {
    justShowLeaderName: true,
    dlcId: 'edward-teach'
  }),
  CivDefFactory('LEADER_TECUMSEH', 'LEADER_TECUMSEH', ASSET_PREFIX, {
    justShowLeaderName: true,
    dlcId: 'napoleon'
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
    dlcId: 'napoleon'
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

// Civilization keys come from the CIV_NAME field in save files (CIVILIZATION_* strings).
// This list needs to be verified/expanded against real save data.
export const CIV7_CIVS = [
  RANDOM_CIVILIZATION,
  // Antiquity Age
  AntiquityCiv('CIVILIZATION_PERSIA', { civDisplayName: 'Achaemenid Persian' }),
  AntiquityCiv('CIVILIZATION_AKSUM'),
  AntiquityCiv('CIVILIZATION_ASSYRIA', { dlcId: 'genghis-khan' }),
  AntiquityCiv('CIVILIZATION_CARTHAGE', {
    dlcId: 'ada-lovelace'
  }),
  AntiquityCiv('CIVILIZATION_EGYPT'),
  AntiquityCiv('CIVILIZATION_GREECE'),
  AntiquityCiv('CIVILIZATION_HAN'),
  AntiquityCiv('CIVILIZATION_KHMER'),
  AntiquityCiv('CIVILIZATION_MAURYA'),
  AntiquityCiv('CIVILIZATION_MAYA'),
  AntiquityCiv('CIVILIZATION_MISSISSIPPIAN'),
  AntiquityCiv('CIVILIZATION_ROME'),
  AntiquityCiv('CIVILIZATION_SILLA', { dlcId: 'genghis-khan' }),
  AntiquityCiv('CIVILIZATION_TONGA', { dlcId: 'edward-teach' }),
  // Exploration Age
  ExplorationCiv('CIVILIZATION_ABBASID'),
  ExplorationCiv('CIVILIZATION_BULGARIA', {
    dlcId: 'ada-lovelace'
  }),
  ExplorationCiv('CIVILIZATION_CHOLA'),
  ExplorationCiv('CIVILIZATION_HAWAII'),
  ExplorationCiv('CIVILIZATION_ICELAND', { dlcId: 'edward-teach' }),
  ExplorationCiv('CIVILIZATION_INCA'),
  ExplorationCiv('CIVILIZATION_MAJAPAHIT'),
  ExplorationCiv('CIVILIZATION_MING'),
  ExplorationCiv('CIVILIZATION_MONGOLIA'),
  ExplorationCiv('CIVILIZATION_NORMAN'),
  ExplorationCiv('CIVILIZATION_PIRATE_REPUBLIC', {
    civDisplayName: 'Republic of Pirates',
    dlcId: 'edward-teach'
  }),
  ExplorationCiv('CIVILIZATION_SHAWNEE', { dlcId: 'napoleon' }),
  ExplorationCiv('CIVILIZATION_SONGHAI'),
  ExplorationCiv('CIVILIZATION_SPAIN'),
  ExplorationCiv('CIVILIZATION_DAI_VIET', { civDisplayName: 'Đại Việt', dlcId: 'genghis-khan' }),
  // Modern Age
  ModernCiv('CIVILIZATION_AMERICA'),
  ModernCiv('CIVILIZATION_GREAT_BRITAIN', {
    dlcId: 'ada-lovelace'
  }),
  ModernCiv('CIVILIZATION_BUGANDA'),
  ModernCiv('CIVILIZATION_FRENCH_EMPIRE'),
  ModernCiv('CIVILIZATION_MEIJI', { civDisplayName: 'Meiji Japanese' }),
  ModernCiv('CIVILIZATION_MEXICO'),
  ModernCiv('CIVILIZATION_MUGHAL'),
  ModernCiv('CIVILIZATION_NEPAL', {
    dlcId: 'ada-lovelace'
  }),
  ModernCiv('CIVILIZATION_OTTOMANS', { dlcId: 'edward-teach' }),
  ModernCiv('CIVILIZATION_PRUSSIA'),
  ModernCiv('CIVILIZATION_QAJAR', { dlcId: 'genghis-khan' }),
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
  gameSpeeds: CIV7_GAME_SPEEDS,
  leaders: CIV7_LEADERS,
  civilizations: CIV7_CIVS,
  maps: CIV7_MAPS,
  mapSizes: CIV7_MAP_SIZES,
  saveLocations: {
    [Platform.Windows]: { basePath: BasePath.DOCUMENTS, prefix: '/My Games' },
    [Platform.OSX]: {
      basePath: BasePath.APP_DATA,
      prefix: ''
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
  }
};
