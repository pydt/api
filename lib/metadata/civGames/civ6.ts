import { GameStore, Platform } from 'pydt-shared-models';
import { BasePath, CivDefFactory, CivGame, DlcFactory, GameSpeedFactory, MapFactory, MapSizeFactory, RANDOM_CIV } from '../civGame';

export const CIV6_DLCS = [
  DlcFactory('02A8BDDE-67EA-4D38-9540-26E685E3156E', 'Aztec Civilization Pack'),
  DlcFactory('3809975F-263F-40A2-A747-8BFB171D821A', 'Poland Civilization & Scenario Pack'),
  DlcFactory('2F6E858A-28EF-46B3-BEAC-B985E52E9BC1', 'Vikings Scenario Pack'),
  DlcFactory('E3F53C61-371C-440B-96CE-077D318B36C0', 'Australia Civilization & Scenario Pack'),
  DlcFactory('E2749E9A-8056-45CD-901B-C368C8E83DEB', 'Persia and Macedon Civilization & Scenario Pack'),
  DlcFactory('643EA320-8E1A-4CF1-A01C-00D88DDD131A', 'Nubia Civilization & Scenario Pack'),
  DlcFactory('1F367231-A040-4793-BDBB-088816853683', 'Khmer and Indonesia Civilization & Scenario Pack'),
  DlcFactory('9DE86512-DE1A-400D-8C0A-AB46EBBF76B9', 'Maya and Gran Colombia Pack'),
  DlcFactory('1B394FE9-23DC-4868-8F0A-5220CB8FB427', 'Ethiopia Pack'),
  DlcFactory('113D9459-0A3B-4FCB-A49C-483F40303575', 'Teddy Roosevelt Persona Pack'),
  DlcFactory('CE5876CD-6900-46D1-9C9C-8DBA1F28872E', 'Catherine de Medici Persona Pack'),
  DlcFactory('A1100FC4-70F2-4129-AC27-2A65A685ED08', 'Byzantium and Gaul Pack'),
  DlcFactory('8424840C-92EF-4426-A9B4-B4E0CB818049', 'Babylon Pack'),
  DlcFactory('1B28771A-C749-434B-9053-D1380C553DE9', 'Rise and Fall Expansion', true),
  DlcFactory('4873eb62-8ccc-4574-b784-dda455e74e68', 'Gathering Storm Expansion', true)
];

const ASSET_PREFIX = '';

export const CIV6_LEADERS = [
  RANDOM_CIV,
  CivDefFactory('CIVILIZATION_MACEDON', 'LEADER_ALEXANDER', ASSET_PREFIX, {
    dlcId: 'E2749E9A-8056-45CD-901B-C368C8E83DEB'
  }),
  CivDefFactory('CIVILIZATION_NUBIA', 'LEADER_AMANITORE', ASSET_PREFIX, {
    dlcId: '643EA320-8E1A-4CF1-A01C-00D88DDD131A'
  }),
  CivDefFactory('CIVILIZATION_GAUL', 'LEADER_AMBIORIX', ASSET_PREFIX, {
    dlcId: 'A1100FC4-70F2-4129-AC27-2A65A685ED08'
  }),
  CivDefFactory('CIVILIZATION_BYZANTIUM', 'LEADER_BASIL', ASSET_PREFIX, {
    leaderDisplayName: 'Basil II',
    dlcId: 'A1100FC4-70F2-4129-AC27-2A65A685ED08'
  }),
  CivDefFactory('CIVILIZATION_FRANCE', 'LEADER_CATHERINE_DE_MEDICI', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_FRANCE', 'LEADER_CATHERINE_DE_MEDICI_ALT', ASSET_PREFIX, {
    leaderDisplayName: 'Catherine De Medici (Magnificence)',
    dlcId: 'CE5876CD-6900-46D1-9C9C-8DBA1F28872E'
  }),
  CivDefFactory('CIVILIZATION_INDIA', 'LEADER_CHANDRAGUPTA', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_EGYPT', 'LEADER_CLEOPATRA', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_PERSIA', 'LEADER_CYRUS', ASSET_PREFIX, {
    dlcId: 'E2749E9A-8056-45CD-901B-C368C8E83DEB'
  }),
  CivDefFactory('CIVILIZATION_GERMANY', 'LEADER_BARBAROSSA', ASSET_PREFIX, {
    leaderDisplayName: 'Frederick Barbarossa'
  }),
  CivDefFactory('CIVILIZATION_PHOENICIA', 'LEADER_DIDO', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68'
  }),
  CivDefFactory('CIVILIZATION_ENGLAND', 'LEADER_ELEANOR_ENGLAND', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68',
    leaderDisplayName: 'Eleanor of Aquitaine'
  }),
  CivDefFactory('CIVILIZATION_FRANCE', 'LEADER_ELEANOR_FRANCE', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68',
    leaderDisplayName: 'Eleanor of Aquitaine'
  }),
  CivDefFactory('CIVILIZATION_INDIA', 'LEADER_GANDHI', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_MONGOLIA', 'LEADER_GENGHIS_KHAN', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_SUMERIA', 'LEADER_GILGAMESH', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_INDONESIA', 'LEADER_GITARJA', ASSET_PREFIX, {
    dlcId: '1F367231-A040-4793-BDBB-088816853683'
  }),
  CivDefFactory('CIVILIZATION_GREECE', 'LEADER_GORGO', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_NORWAY', 'LEADER_HARDRADA', ASSET_PREFIX, {
    leaderDisplayName: 'Harald Hardrada'
  }),
  CivDefFactory('CIVILIZATION_BABYLON_STK', 'LEADER_HAMMURABI', ASSET_PREFIX, {
    civDisplayName: 'Babylon',
    dlcId: '8424840C-92EF-4426-A9B4-B4E0CB818049'
  }),
  CivDefFactory('CIVILIZATION_JAPAN', 'LEADER_HOJO', ASSET_PREFIX, {
    leaderDisplayName: 'Hojo Tokimune'
  }),
  CivDefFactory('CIVILIZATION_POLAND', 'LEADER_JADWIGA', ASSET_PREFIX, {
    dlcId: '3809975F-263F-40A2-A747-8BFB171D821A'
  }),
  CivDefFactory('CIVILIZATION_KHMER', 'LEADER_JAYAVARMAN', ASSET_PREFIX, {
    dlcId: '1F367231-A040-4793-BDBB-088816853683'
  }),
  CivDefFactory('CIVILIZATION_AUSTRALIA', 'LEADER_JOHN_CURTIN', ASSET_PREFIX, {
    dlcId: 'E3F53C61-371C-440B-96CE-077D318B36C0'
  }),
  CivDefFactory('CIVILIZATION_SWEDEN', 'LEADER_KRISTINA', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68'
  }),
  CivDefFactory('CIVILIZATION_MAORI', 'LEADER_KUPE', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68'
  }),
  CivDefFactory('CIVILIZATION_MAYA', 'LEADER_LADY_SIX_SKY', ASSET_PREFIX, {
    dlcId: '9DE86512-DE1A-400D-8C0A-AB46EBBF76B9'
  }),
  CivDefFactory('CIVILIZATION_MAPUCHE', 'LEADER_LAUTARO', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_MALI', 'LEADER_MANSA_MUSA', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68'
  }),
  CivDefFactory('CIVILIZATION_HUNGARY', 'LEADER_MATTHIAS_CORVINUS', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68'
  }),
  CivDefFactory('CIVILIZATION_AZTEC', 'LEADER_MONTEZUMA', ASSET_PREFIX, {
    dlcId: '02A8BDDE-67EA-4D38-9540-26E685E3156E'
  }),
  CivDefFactory('CIVILIZATION_ETHIOPIA', 'LEADER_MENELIK', ASSET_PREFIX, {
    dlcId: '1B394FE9-23DC-4868-8F0A-5220CB8FB427',
    leaderDisplayName: 'Menelik II'
  }),
  CivDefFactory('CIVILIZATION_KONGO', 'LEADER_MVEMBA', ASSET_PREFIX, {
    leaderDisplayName: 'Mvemba a Nzinga'
  }),
  CivDefFactory('CIVILIZATION_INCA', 'LEADER_PACHACUTI', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68'
  }),
  CivDefFactory('CIVILIZATION_BRAZIL', 'LEADER_PEDRO', ASSET_PREFIX, {
    leaderDisplayName: 'Pedro II'
  }),
  CivDefFactory('CIVILIZATION_GREECE', 'LEADER_PERICLES', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_RUSSIA', 'LEADER_PETER_GREAT', ASSET_PREFIX, {
    leaderDisplayName: 'Peter the Great'
  }),
  CivDefFactory('CIVILIZATION_SPAIN', 'LEADER_PHILIP_II', ASSET_PREFIX, {
    leaderDisplayName: 'Philip II'
  }),
  CivDefFactory('CIVILIZATION_CREE', 'LEADER_POUNDMAKER', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_CHINA', 'LEADER_QIN', ASSET_PREFIX, {
    leaderDisplayName: 'Qin Shi Huang'
  }),
  CivDefFactory('CIVILIZATION_SCOTLAND', 'LEADER_ROBERT_THE_BRUCE', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_ARABIA', 'LEADER_SALADIN', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_KOREA', 'LEADER_SEONDEOK', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_ZULU', 'LEADER_SHAKA', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_GRAN_COLOMBIA', 'LEADER_SIMON_BOLIVAR', ASSET_PREFIX, {
    dlcId: '9DE86512-DE1A-400D-8C0A-AB46EBBF76B9'
  }),
  CivDefFactory('CIVILIZATION_OTTOMAN', 'LEADER_SULEIMAN', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68'
  }),
  CivDefFactory('CIVILIZATION_GEORGIA', 'LEADER_TAMAR', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_AMERICA', 'LEADER_T_ROOSEVELT', ASSET_PREFIX, {
    leaderDisplayName: 'Teddy Roosevelt'
  }),
  CivDefFactory('CIVILIZATION_AMERICA', 'LEADER_T_ROOSEVELT_ROUGHRIDER', ASSET_PREFIX, {
    leaderDisplayName: 'Teddy Roosevelt (Rough Rider)',
    dlcId: '113D9459-0A3B-4FCB-A49C-483F40303575'
  }),
  CivDefFactory('CIVILIZATION_SCYTHIA', 'LEADER_TOMYRIS', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_ROME', 'LEADER_TRAJAN', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_CANADA', 'LEADER_LAURIER', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68',
    leaderDisplayName: 'Wilfrid Laurier'
  }),
  CivDefFactory('CIVILIZATION_NETHERLANDS', 'LEADER_WILHELMINA', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_ENGLAND', 'LEADER_VICTORIA', ASSET_PREFIX)
];

export const CIV6_GAME_SPEEDS = [
  GameSpeedFactory('GAMESPEED_ONLINE', 'Online'),
  GameSpeedFactory('GAMESPEED_QUICK', 'Quick'),
  GameSpeedFactory('GAMESPEED_STANDARD', 'Standard'),
  GameSpeedFactory('GAMESPEED_EPIC', 'Epic'),
  GameSpeedFactory('GAMESPEED_MARATHON', 'Marathon')
];

export const CIV6_MAP_SIZES = [
  MapSizeFactory('MAPSIZE_DUEL', 'Duel', 2),
  MapSizeFactory('MAPSIZE_TINY', 'Tiny', 4),
  MapSizeFactory('MAPSIZE_SMALL', 'Small', 6),
  MapSizeFactory('MAPSIZE_STANDARD', 'Standard', 8),
  MapSizeFactory('MAPSIZE_LARGE', 'Large', 10),
  MapSizeFactory('MAPSIZE_HUGE', 'Huge', 12)
];

export const CIV6_MAPS = [
  MapFactory('Continents.lua', 'Continents'),
  MapFactory('Fractal.lua', 'Fractal'),
  MapFactory('InlandSea.lua', 'Inland Sea'),
  MapFactory('Island_Plates.lua', 'Island Plates'),
  MapFactory('Pangaea.lua', 'Pangaea'),
  MapFactory('Shuffle.lua', 'Shuffle'),
  MapFactory('Balanced4.Civ6Map', '4-Leaf Clover', CIV6_MAP_SIZES[1]),
  MapFactory('Balanced6.Civ6Map', '6-Armed Snowflake', CIV6_MAP_SIZES[2]),
  MapFactory('EarthStandard.Civ6Map', 'Earth Map', CIV6_MAP_SIZES[3], 'EarthStandard.*\\.Civ6Map$')
];

export const CIV6_GAME: CivGame = {
  id: 'CIV6',
  displayName: 'Civilization 6',
  turnTimerSupported: false,
  assetPrefix: ASSET_PREFIX,
  dlcs: CIV6_DLCS,
  gameSpeeds: CIV6_GAME_SPEEDS,
  leaders: CIV6_LEADERS,
  maps: CIV6_MAPS,
  mapSizes: CIV6_MAP_SIZES,
  saveLocations: {
    [Platform.Windows]: { basePath: BasePath.DOCUMENTS, prefix: '/My Games' },
    [Platform.OSX]: { basePath: BasePath.APP_DATA, prefix: '' },
    [Platform.Linux]: { basePath: BasePath.HOME, prefix: '/.local/share/aspyr-media' }
  },
  dataPaths: {
    [GameStore.Steam]: "/Sid Meier's Civilization VI",
    [GameStore.Epic]: "/Sid Meier's Civilization VI (Epic)"
  },
  savePath: '/Saves/Hotseat/',
  saveExtension: 'Civ6Save',
  runUrls: {
    [GameStore.Steam]: 'steam://run/289070/\\dx11',
    [GameStore.Epic]: 'com.epicgames.launcher://apps/Kinglet?action=launch&silent=true'
  }
};
