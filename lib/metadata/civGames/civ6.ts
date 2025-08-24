import { GameStore, Platform } from 'pydt-shared-models';
import {
  BasePath,
  CivDefFactory,
  CivGame,
  createProtonPath,
  DlcFactory,
  GameSpeedFactory,
  MapFactory,
  MapSizeFactory,
  RANDOM_CIV
} from '../civGame';

export const CIV6_DLCS = [
  DlcFactory('02A8BDDE-67EA-4D38-9540-26E685E3156E', 'Aztec Civilization Pack'),
  DlcFactory('3809975F-263F-40A2-A747-8BFB171D821A', 'Poland Civilization & Scenario Pack'),
  DlcFactory('2F6E858A-28EF-46B3-BEAC-B985E52E9BC1', 'Vikings Scenario Pack'),
  DlcFactory('E3F53C61-371C-440B-96CE-077D318B36C0', 'Australia Civilization & Scenario Pack'),
  DlcFactory(
    'E2749E9A-8056-45CD-901B-C368C8E83DEB',
    'Persia and Macedon Civilization & Scenario Pack'
  ),
  DlcFactory('643EA320-8E1A-4CF1-A01C-00D88DDD131A', 'Nubia Civilization & Scenario Pack'),
  DlcFactory(
    '1F367231-A040-4793-BDBB-088816853683',
    'Khmer and Indonesia Civilization & Scenario Pack'
  ),
  DlcFactory('9DE86512-DE1A-400D-8C0A-AB46EBBF76B9', 'Maya and Gran Colombia Pack'),
  DlcFactory('1B394FE9-23DC-4868-8F0A-5220CB8FB427', 'Ethiopia Pack'),
  DlcFactory('113D9459-0A3B-4FCB-A49C-483F40303575', 'Teddy Roosevelt Persona Pack'),
  DlcFactory('CE5876CD-6900-46D1-9C9C-8DBA1F28872E', 'Catherine de Medici Persona Pack'),
  DlcFactory('A1100FC4-70F2-4129-AC27-2A65A685ED08', 'Byzantium and Gaul Pack'),
  DlcFactory('8424840C-92EF-4426-A9B4-B4E0CB818049', 'Babylon Pack'),
  DlcFactory('A3F42CD4-6C3E-4F5A-BC81-BE29E0C0B87C', 'Vietnam and Kublai Khan Pack'),
  DlcFactory('FFDF4E79-DEE2-47BB-919B-F5739106627A', 'Portugal Pack'),
  DlcFactory('7A66DB58-B354-4061-8C80-95B638DD6F6C', 'Great Negotiators Leader Pack'),
  DlcFactory(
    '9ED63236-617C-45A6-BB70-8CB6B0BE8ED2',
    'Julius Caesar Leader Pack',
    false,
    'You must link your 2K account to get this DLC!'
  ),
  DlcFactory('7D27831B-BAA6-4A8B-A39C-94243BAD3F47', 'Rulers of China Leader Pack'),
  DlcFactory('F48213B4-56F5-45DD-92F7-AC78E49BDA49', 'Great Commanders Pack'),
  DlcFactory('82AE6F24-930F-4640-833C-FCDFD4845757', 'Rulers of the Sahara Leader Pack'),
  DlcFactory('249D9276-0832-48E4-B370-14531FA4E33C', 'Great Builders Leader Pack'),
  DlcFactory('258EF3CA-890B-4863-8A52-982822EFF7BD', 'Rulers of England Leader Pack'),
  DlcFactory('2A0AA96A-A31C-4CE2-87EC-09152F6F3E00', 'Better Balanced Game Expanded Mod', false, 'Community Mod'),
  DlcFactory('1B28771A-C749-434B-9053-D1380C553DE9', 'Rise and Fall Expansion', true),
  DlcFactory('4873eb62-8ccc-4574-b784-dda455e74e68', 'Gathering Storm Expansion', true)
];

const ASSET_PREFIX = '';

export const CIV6_LEADERS = [
  RANDOM_CIV,
  CivDefFactory('CIVILIZATION_AMERICA', 'LEADER_ABRAHAM_LINCOLN', ASSET_PREFIX, {
    dlcId: '7A66DB58-B354-4061-8C80-95B638DD6F6C'
  }),
  CivDefFactory('CIVILIZATION_MACEDON', 'LEADER_ALEXANDER', ASSET_PREFIX, {
    dlcId: 'E2749E9A-8056-45CD-901B-C368C8E83DEB'
  }),
  CivDefFactory('CIVILIZATION_MACEDON', 'LEADER_JFD_OLYMPIAS', ASSET_PREFIX, {
    dlcId: '2a0aa96a-a31c-4ce2-87ec-09152f6f3e00'
  }),
  CivDefFactory('CIVILIZATION_NUBIA', 'LEADER_AMANITORE', ASSET_PREFIX, {
    dlcId: '643EA320-8E1A-4CF1-A01C-00D88DDD131A'
  }),
  CivDefFactory('CIVILIZATION_GAUL', 'LEADER_AMBIORIX', ASSET_PREFIX, {
    dlcId: 'A1100FC4-70F2-4129-AC27-2A65A685ED08'
  }),
  CivDefFactory('CIVILIZATION_GAUL', 'LEADER_SUK_VERCINGETORIX_DLC', ASSET_PREFIX, {
    dlcId: '2a0aa96a-a31c-4ce2-87ec-09152f6f3e00'
  }),
  CivDefFactory('CIVILIZATION_BYZANTIUM', 'LEADER_BASIL', ASSET_PREFIX, {
    leaderDisplayName: 'Basil II',
    dlcId: 'A1100FC4-70F2-4129-AC27-2A65A685ED08'
  }),
  CivDefFactory('CIVILIZATION_VIETNAM', 'LEADER_LADY_TRIEU', ASSET_PREFIX, {
    leaderDisplayName: 'Ba Trieu',
    dlcId: 'A3F42CD4-6C3E-4F5A-BC81-BE29E0C0B87C'
  }),
  CivDefFactory('CIVILIZATION_FRANCE', 'LEADER_CATHERINE_DE_MEDICI', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_FRANCE', 'LEADER_CATHERINE_DE_MEDICI_ALT', ASSET_PREFIX, {
    leaderDisplayName: 'Catherine De Medici (Magnificence)',
    dlcId: 'CE5876CD-6900-46D1-9C9C-8DBA1F28872E'
  }),
  CivDefFactory('CIVILIZATION_INDIA', 'LEADER_CHANDRAGUPTA', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_EGYPT', 'LEADER_CLEOPATRA', ASSET_PREFIX, {
    leaderDisplayName: 'Cleopatra (Egyptian)'
  }),
  CivDefFactory('CIVILIZATION_EGYPT', 'LEADER_CLEOPATRA_ALT', ASSET_PREFIX, {
    leaderDisplayName: 'Cleopatra (Ptolemaic)',
    dlcId: '82AE6F24-930F-4640-833C-FCDFD4845757'
  }),
  CivDefFactory('CIVILIZATION_PERSIA', 'LEADER_CYRUS', ASSET_PREFIX, {
    dlcId: 'E2749E9A-8056-45CD-901B-C368C8E83DEB'
  }),
  CivDefFactory('CIVILIZATION_GERMANY', 'LEADER_BARBAROSSA', ASSET_PREFIX, {
    leaderDisplayName: 'Frederick Barbarossa'
  }),
  CivDefFactory('CIVILIZATION_PHOENICIA', 'LEADER_DIDO', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68'
  }),
  CivDefFactory('CIVILIZATION_PHOENICIA', 'LEADER_LIME_PHOE_AHIRAM', ASSET_PREFIX, {
    dlcId: '2a0aa96a-a31c-4ce2-87ec-09152f6f3e00'
  }),
  CivDefFactory('CIVILIZATION_ENGLAND', 'LEADER_ELEANOR_ENGLAND', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68',
    leaderDisplayName: 'Eleanor of Aquitaine'
  }),
  CivDefFactory('CIVILIZATION_FRANCE', 'LEADER_ELEANOR_FRANCE', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68',
    leaderDisplayName: 'Eleanor of Aquitaine'
  }),
  CivDefFactory('CIVILIZATION_ENGLAND', 'LEADER_ELIZABETH', ASSET_PREFIX, {
    dlcId: '258EF3CA-890B-4863-8A52-982822EFF7BD',
    leaderDisplayName: 'Elizabeth I'
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
    leaderDisplayName: 'Harald Hardrada (Konge)'
  }),
  CivDefFactory('CIVILIZATION_NORWAY', 'LEADER_HARALD_ALT', ASSET_PREFIX, {
    dlcId: '258EF3CA-890B-4863-8A52-982822EFF7BD',
    leaderDisplayName: 'Harald Hardrada (Varangian)'
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
  CivDefFactory('CIVILIZATION_ROME', 'LEADER_JULIUS_CAESAR', ASSET_PREFIX, {
    dlcId: '9ED63236-617C-45A6-BB70-8CB6B0BE8ED2'
  }),
  CivDefFactory('CIVILIZATION_PORTUGAL', 'LEADER_JOAO_III', ASSET_PREFIX, {
    dlcId: 'FFDF4E79-DEE2-47BB-919B-F5739106627A'
  }),
  CivDefFactory('CIVILIZATION_AUSTRALIA', 'LEADER_JOHN_CURTIN', ASSET_PREFIX, {
    dlcId: 'E3F53C61-371C-440B-96CE-077D318B36C0'
  }),
  CivDefFactory('CIVILIZATION_SWEDEN', 'LEADER_KRISTINA', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68'
  }),
  CivDefFactory('CIVILIZATION_CHINA', 'LEADER_KUBLAI_KHAN_CHINA', ASSET_PREFIX, {
    leaderDisplayName: 'Kublai Khan',
    dlcId: 'A3F42CD4-6C3E-4F5A-BC81-BE29E0C0B87C'
  }),
  CivDefFactory('CIVILIZATION_MONGOLIA', 'LEADER_KUBLAI_KHAN_MONGOLIA', ASSET_PREFIX, {
    leaderDisplayName: 'Kublai Khan',
    dlcId: 'A3F42CD4-6C3E-4F5A-BC81-BE29E0C0B87C'
  }),
  CivDefFactory('CIVILIZATION_MAORI', 'LEADER_KUPE', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68'
  }),
  CivDefFactory('CIVILIZATION_MAYA', 'LEADER_LADY_SIX_SKY', ASSET_PREFIX, {
    dlcId: '9DE86512-DE1A-400D-8C0A-AB46EBBF76B9'
  }),
  CivDefFactory('CIVILIZATION_MAYA', 'LEADER_LL_TEKINICH_II', ASSET_PREFIX, {
    dlcId: '2a0aa96a-a31c-4ce2-87ec-09152f6f3e00'
  }),
  CivDefFactory('CIVILIZATION_MAPUCHE', 'LEADER_LAUTARO', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_MALI', 'LEADER_MANSA_MUSA', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68'
  }),
  CivDefFactory('CIVILIZATION_GERMANY', 'LEADER_LUDWIG', ASSET_PREFIX, {
    dlcId: '249D9276-0832-48E4-B370-14531FA4E33C',
    leaderDisplayName: 'Ludwig II'
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
  CivDefFactory('CIVILIZATION_PERSIA', 'LEADER_NADER_SHAH', ASSET_PREFIX, {
    dlcId: 'F48213B4-56F5-45DD-92F7-AC78E49BDA49'
  }),
  CivDefFactory('CIVILIZATION_KONGO', 'LEADER_NZINGA_MBANDE', ASSET_PREFIX, {
    dlcId: '7A66DB58-B354-4061-8C80-95B638DD6F6C'
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
    leaderDisplayName: 'Qin (Mandate of Heaven)'
  }),
  CivDefFactory('CIVILIZATION_CHINA', 'LEADER_QIN_ALT', ASSET_PREFIX, {
    dlcId: '7D27831B-BAA6-4A8B-A39C-94243BAD3F47',
    leaderDisplayName: 'Qin (Unifier)'
  }),
  CivDefFactory('CIVILIZATION_EGYPT', 'LEADER_RAMSES', ASSET_PREFIX, {
    leaderDisplayName: 'Ramses II',
    dlcId: '82AE6F24-930F-4640-833C-FCDFD4845757'
  }),
  CivDefFactory('CIVILIZATION_SCOTLAND', 'LEADER_ROBERT_THE_BRUCE', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_ARABIA', 'LEADER_SALADIN', ASSET_PREFIX, {
    leaderDisplayName: 'Saladin (Vizier)'
  }),
  CivDefFactory('CIVILIZATION_ARABIA', 'LEADER_SALADIN_ALT', ASSET_PREFIX, {
    leaderDisplayName: 'Saladin (Sultan)',
    dlcId: '7A66DB58-B354-4061-8C80-95B638DD6F6C'
  }),
  CivDefFactory('CIVILIZATION_KOREA', 'LEADER_SEJONG', ASSET_PREFIX, {
    dlcId: '249D9276-0832-48E4-B370-14531FA4E33C'
  }),
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
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68',
    civDisplayName: 'Suleiman (Kanuni)'
  }),
  CivDefFactory('CIVILIZATION_OTTOMAN', 'LEADER_SULEIMAN_ALT', ASSET_PREFIX, {
    dlcId: 'F48213B4-56F5-45DD-92F7-AC78E49BDA49',
    leaderDisplayName: 'Suleiman (Muhteşem)'
  }),
  CivDefFactory('CIVILIZATION_MALI', 'LEADER_SUNDIATA_KEITA', ASSET_PREFIX, {
    dlcId: '82AE6F24-930F-4640-833C-FCDFD4845757'
  }),
  CivDefFactory('CIVILIZATION_GEORGIA', 'LEADER_TAMAR', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_AMERICA', 'LEADER_T_ROOSEVELT', ASSET_PREFIX, {
    leaderDisplayName: 'Teddy Roosevelt (Bull Moose)'
  }),
  CivDefFactory('CIVILIZATION_AMERICA', 'LEADER_T_ROOSEVELT_ROUGHRIDER', ASSET_PREFIX, {
    leaderDisplayName: 'Teddy Roosevelt (Rough Rider)',
    dlcId: '113D9459-0A3B-4FCB-A49C-483F40303575'
  }),
  CivDefFactory('CIVILIZATION_BYZANTIUM', 'LEADER_THEODORA', ASSET_PREFIX, {
    dlcId: '249D9276-0832-48E4-B370-14531FA4E33C'
  }),
  CivDefFactory('CIVILIZATION_JAPAN', 'LEADER_TOKUGAWA', ASSET_PREFIX, {
    dlcId: 'F48213B4-56F5-45DD-92F7-AC78E49BDA49'
  }),
  CivDefFactory('CIVILIZATION_SCYTHIA', 'LEADER_TOMYRIS', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_ROME', 'LEADER_TRAJAN', ASSET_PREFIX),
  CivDefFactory('CIVILIZATION_CANADA', 'LEADER_LAURIER', ASSET_PREFIX, {
    dlcId: '4873eb62-8ccc-4574-b784-dda455e74e68',
    leaderDisplayName: 'Wilfrid Laurier'
  }),
  CivDefFactory('CIVILIZATION_ENGLAND', 'LEADER_VICTORIA', ASSET_PREFIX, {
    leaderDisplayName: 'Victoria (Age of Empire)'
  }),
  CivDefFactory('CIVILIZATION_ENGLAND', 'LEADER_VICTORIA_ALT', ASSET_PREFIX, {
    dlcId: '258EF3CA-890B-4863-8A52-982822EFF7BD',
    leaderDisplayName: 'Victoria (Age of Steam)'
  }),
  CivDefFactory('CIVILIZATION_NETHERLANDS', 'LEADER_WILHELMINA', ASSET_PREFIX, {
    dlcId: '1B28771A-C749-434B-9053-D1380C553DE9'
  }),
  CivDefFactory('CIVILIZATION_CHINA', 'LEADER_WU_ZETIAN', ASSET_PREFIX, {
    dlcId: '7D27831B-BAA6-4A8B-A39C-94243BAD3F47'
  }),
  CivDefFactory('CIVILIZATION_CHINA', 'LEADER_YONGLE', ASSET_PREFIX, {
    dlcId: '7D27831B-BAA6-4A8B-A39C-94243BAD3F47'
  }),
  CivDefFactory('CIVILIZATION_LIME_THULE', 'LEADER_LIME_THULE_DAVE', ASSET_PREFIX, {
    dlcId: '2a0aa96a-a31c-4ce2-87ec-09152f6f3e00'
  }),
  CivDefFactory('CIVILIZATION_LIME_TEOTIHUACAN', 'LEADER_LIME_TEO_OWL', ASSET_PREFIX, {
    dlcId: '2a0aa96a-a31c-4ce2-87ec-09152f6f3e00'
  }),
  CivDefFactory('CIVILIZATION_SUK_TIBET', 'LEADER_SUK_TRISONG_DETSEN', ASSET_PREFIX, {
    dlcId: '2a0aa96a-a31c-4ce2-87ec-09152f6f3e00'
  }),
  CivDefFactory('CIVILIZATION_SUK_SWAHILI', 'LEADER_SUK_AL_HASAN', ASSET_PREFIX, {
    dlcId: '2a0aa96a-a31c-4ce2-87ec-09152f6f3e00'
  })
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
  turnTimerSupported: true,
  assetPrefix: ASSET_PREFIX,
  dlcs: CIV6_DLCS,
  gameSpeeds: CIV6_GAME_SPEEDS,
  leaders: CIV6_LEADERS,
  maps: CIV6_MAPS,
  mapSizes: CIV6_MAP_SIZES,
  saveLocations: {
    [Platform.Windows]: { basePath: BasePath.DOCUMENTS, prefix: '/My Games' },
    [Platform.OSX]: {
      basePath: BasePath.APP_DATA,
      prefix: '',
      dataPathOverrides: {
        [GameStore.Steam]: "/Sid Meier's Civilization VI/Sid Meier's Civilization VI"
      }
    },
    [Platform.Linux]: { basePath: BasePath.HOME, prefix: '/.local/share/aspyr-media' },
    [Platform.LinuxProton]: { basePath: BasePath.HOME, prefix: createProtonPath('289070') }
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
