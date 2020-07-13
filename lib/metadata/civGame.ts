export interface CivGame {
  id: string;
  displayName: string;
  turnTimerSupported: boolean;
  assetPrefix: string;
  leaders: CivDef[];
  dlcs: DLC[];
  gameSpeeds: GameSpeed[];
  mapSizes: MapSize[];
  maps: Map[];
  saveLocations: { [platform: string]: PlatformSaveLocation };
  dataPaths: { [gameStore: string]: string };
  savePath: string;
  saveExtension: string;
  runUrls: { [gameStore: string]: string };
}

export enum BasePath {
  APP_DATA = 'appData',
  HOME = 'home',
  DOCUMENTS = 'documents'
}

export interface PlatformSaveLocation {
  basePath: BasePath;
  prefix: string;
}

export interface CivDef {
  civKey: string;
  leaderKey: string;
  imageFileName: string;
  fullDisplayName: string;
  civDisplayName: string;
  leaderDisplayName: string;
  options: CivDefOptions;
}

function defaultDisplayName(str: string) {
  str = str.replace('CIVILIZATION_', '').replace('LEADER_', '').replace(/_/g, ' ');

  return str.replace(/\w\S*/g, txt => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

export function CivDefFactory(civKey: string, leaderKey: string, assetPrefix: string, options: CivDefOptions = {}): CivDef {
  const civDisplayName = defaultDisplayName(civKey);
  const leaderDisplayName = options.leaderDisplayName || defaultDisplayName(leaderKey);

  let fullDisplayName = leaderDisplayName;

  if (!options.justShowLeaderName) {
    fullDisplayName += ` (${civDisplayName})`;
  }

  return {
    civKey,
    leaderKey,
    civDisplayName,
    leaderDisplayName,
    options,
    imageFileName: `${assetPrefix}${civKey.replace('CIVILIZATION_', '')}_${leaderKey.replace('LEADER_', '')}.png`,
    fullDisplayName
  };
}

export interface CivDefOptions {
  leaderDisplayName?: string;
  dlcId?: string;
  justShowLeaderName?: boolean;
}

export interface DLC {
  id: string;
  displayName: string;
  major: boolean;
}

export function DlcFactory(id: string, displayName: string, major = false): DLC {
  return {
    id,
    displayName,
    major
  };
}

export const RANDOM_CIV = CivDefFactory('CIVILIZATION_RANDOM', 'LEADER_RANDOM', '', {
  leaderDisplayName: 'Random Leader',
  justShowLeaderName: true
});

export interface GameSpeed {
  key: string;
  displayName: string;
}

export function GameSpeedFactory(key: string, displayName: string): GameSpeed {
  return {
    key,
    displayName
  };
}

export interface MapSize {
  key: string;
  displayName: string;
  players: number;
}

export function MapSizeFactory(key: string, displayName: string, players: number): MapSize {
  return {
    key,
    displayName,
    players
  };
}

export interface Map {
  file: string;
  displayName: string;
  mapSize?: MapSize;
  regex?: string;
}

export function MapFactory(file: string, displayName: string, mapSize?: MapSize, regex?: string): Map {
  return {
    file,
    displayName,
    mapSize,
    regex
  };
}
