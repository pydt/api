export interface CivGame {
  id: string;
  displayName: string;
  turnTimerSupported: boolean;
  assetPrefix: string;
  leaders: CivDef[];
  // When true, leaders and civilizations are chosen independently (Civ 7).
  // The civilizations array provides the selectable civ list; leaders provides the leader list.
  separateLeaderCiv?: boolean;
  civilizations?: CivDef[];
  dlcs: DLC[];
  // Optional groupings of dlcs (e.g. all the content bundled into a single release)
  // so they can be selected/deselected together in the UI. Membership doesn't change
  // how individual dlc ids are stored/matched (game.dlc, parsedDlcs) - it's purely
  // presentational grouping on top of the flat `dlcs` list.
  dlcGroups?: DlcGroup[];
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
  dataPathOverrides?: { [gameStore: string]: string };
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

function removePrefixes(str) {
  return ['CIVILIZATION_', 'LEADER_', 'NATION_'].reduce((acc, cur) => acc.replace(cur, ''), str);
}

export function defaultDisplayName(str: string) {
  str = removePrefixes(str).replace(/_/g, ' ');

  return str.replace(/\w\S*/g, txt => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

export function createProtonPath(steamId: string) {
  return `/.local/share/Steam/steamapps/compatdata/${steamId}/pfx/drive_c/users/steamuser/Documents/My Games`;
}

export function CivDefFactory(
  civKey: string,
  leaderKey: string,
  assetPrefix: string,
  options: CivDefOptions = {}
): CivDef {
  const civDisplayName = options.civDisplayName || defaultDisplayName(civKey);
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
    imageFileName: `${assetPrefix}${removePrefixes(civKey)}_${removePrefixes(leaderKey)}.png`,
    fullDisplayName
  };
}

// Creates a civilization-only CivDef for games with separateLeaderCiv (Civ 7).
// civKey is the primary identifier; leaderKey is set to civKey as an unused sentinel.
// Image is named <assetPrefix><civName>.png (no leader suffix).
export function CivOnlyDefFactory(
  civKey: string,
  assetPrefix: string,
  options: CivDefOptions = {}
): CivDef {
  const civDisplayName = options.civDisplayName || defaultDisplayName(civKey);
  return {
    civKey,
    leaderKey: civKey,
    civDisplayName,
    leaderDisplayName: civDisplayName,
    options,
    imageFileName: options.imageFileName ?? `${assetPrefix}${removePrefixes(civKey)}.png`,
    fullDisplayName: civDisplayName
  };
}

export interface CivDefOptions {
  civDisplayName?: string;
  leaderDisplayName?: string;
  dlcId?: string;
  justShowLeaderName?: boolean;
  imageFileName?: string;
}

export interface DLC {
  id: string;
  displayName: string;
  major: boolean;
  extraInfo?: string;
  community: boolean;
}

export function DlcFactory(
  id: string,
  displayName: string,
  major = false,
  extraInfo?: string,
  community?: boolean
): DLC {
  return {
    id,
    displayName,
    major,
    extraInfo,
    community
  };
}

// Groups multiple dlc ids (e.g. all the content bundled into a single release) so
// they can be selected/deselected as one unit in the UI. Referenced dlc ids should
// still exist in the owning CivGame's `dlcs` array - the group is just an overlay.
export interface DlcGroup {
  id: string;
  displayName: string;
  dlcIds: string[];
  major: boolean;
  extraInfo?: string;
  community: boolean;
}

export function DlcGroupFactory(
  id: string,
  displayName: string,
  dlcIds: string[],
  major = false,
  extraInfo?: string,
  community = false
): DlcGroup {
  return {
    id,
    displayName,
    dlcIds,
    major,
    extraInfo,
    community
  };
}

// Upgrades a game's enabled dlc ids for games saved before a group's full membership
// was enumerated (e.g. old Civ7 games only recorded a single representative id per
// release). If any id from a group is present, every sibling in that group is added
// too, since a release's contents are always installed/enabled together in-game.
export function expandDlcGroups(civGame: CivGame, dlcIds: string[]): string[] {
  const result = new Set(dlcIds);

  for (const group of civGame.dlcGroups ?? []) {
    if (group.dlcIds.some(id => result.has(id))) {
      group.dlcIds.forEach(id => result.add(id));
    }
  }

  return [...result];
}

export const RANDOM_CIV = CivDefFactory('CIVILIZATION_RANDOM', 'LEADER_RANDOM', '', {
  leaderDisplayName: 'Random Leader',
  justShowLeaderName: true
});

export const RANDOM_CIVILIZATION = CivOnlyDefFactory('CIVILIZATION_RANDOM', '', {
  civDisplayName: 'Random Civilization',
  imageFileName: 'RANDOM_CIV.png'
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

export function MapFactory(
  file: string,
  displayName: string,
  mapSize?: MapSize,
  regex?: string
): Map {
  return {
    file,
    displayName,
    mapSize,
    regex
  };
}
